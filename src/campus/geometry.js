// Turns the plain numbers in buildings.js / site.js into Three.js geometry.
// Everything here is built once and cached; nothing is recreated per frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BUILDINGS, FLOOR_HEIGHT } from './buildings.js';
import { heightAt, BOUNDS, CAMPUS_OUTLINE, COLORS, SURROUNDINGS, PATHS, STAIRS, PATCHES } from './site.js';
import osm from './osm-surroundings.json';

/** Average of a footprint's corners: [x, z]. */
export function centroid(points) {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

/** True if [x, z] lies inside the polygon. */
export function insidePolygon(points, x, z) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i], [xj, zj] = points[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Bottom and top height of one building part. The bottom goes a little below the
 * lowest corner so buildings on the slope never float; the top is measured from
 * the ground at the part's centre.
 */
export function partHeights(part) {
  const ground = Math.min(...part.footprint.map(([x, z]) => heightAt(x, z)));
  const [cx, cz] = centroid(part.footprint);
  const top = heightAt(cx, cz) + part.floors * (part.floorHeight ?? FLOOR_HEIGHT);
  return { bottom: ground - 3, top };
}

/** A vertical prism with the given footprint, from y = bottom to y = top. */
export function extrudeFootprint(points, bottom, top) {
  // Shapes are drawn in a flat XY plane, then rotated to lie on the ground.
  // Rotating -90° around X turns shape (x, y) into world (x, ·, -y), so use y = -z.
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: top - bottom, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bottom, 0);
  return geometry;
}

/** The ground: a grid that follows the slope, coloured light inside the campus. */
export function buildTerrain(step = 4) {
  const width = BOUNDS.maxX - BOUNDS.minX, depth = BOUNDS.maxZ - BOUNDS.minZ;
  const geometry = new THREE.PlaneGeometry(width, depth, Math.round(width / step), Math.round(depth / step));
  geometry.rotateX(-Math.PI / 2); // lie flat; plane y becomes -z
  geometry.translate(BOUNDS.minX + width / 2, 0, BOUNDS.minZ + depth / 2);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const inside = new THREE.Color(COLORS.campusGround), outside = new THREE.Color(COLORS.background);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    (insidePolygon(CAMPUS_OUTLINE, x, z) ? inside : outside).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Flat ribbons ({ width, points }) following the slope, merged into one geometry. `lift` = metres above the ground. */
function buildRibbons(items, lift, step = 4) {
  const positions = [];
  for (const street of items) {
    const half = street.width / 2;
    // Split long segments so the ribbon follows the hill.
    const pts = [];
    street.points.forEach(([x, z], i) => {
      if (i > 0) {
        const [px, pz] = street.points[i - 1];
        const n = Math.ceil(Math.hypot(x - px, z - pz) / step);
        for (let k = 1; k < n; k++) pts.push([px + ((x - px) * k) / n, pz + ((z - pz) * k) / n]);
      }
      pts.push([x, z]);
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const nx = (-(bz - az) / len) * half, nz = ((bx - ax) / len) * half; // sideways offset
      // Extend each piece slightly so joints at corners don't show gaps.
      const ex = ((bx - ax) / len) * half * 0.5, ez = ((bz - az) / len) * half * 0.5;
      const ya = heightAt(ax, az) + lift, yb = heightAt(bx, bz) + lift;
      const a1 = [ax - ex + nx, ya, az - ez + nz], a2 = [ax - ex - nx, ya, az - ez - nz];
      const b1 = [bx + ex + nx, yb, bz + ez + nz], b2 = [bx + ex - nx, yb, bz + ez - nz];
      positions.push(...a1, ...b1, ...a2, ...a2, ...b1, ...b2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Distance (m) from a point to a polygon's edge; 0 if the point is inside. */
function distanceToPolygon(points, x, z) {
  if (insidePolygon(points, x, z)) return 0;
  let best = Infinity;
  points.forEach(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  });
  return best;
}

/** Neighbouring city buildings near the campus as plain blocks, merged into one geometry. */
export function buildSurroundings() {
  // Areas to draw neighbours around: the campus, plus LAU buildings outside it (Gezairi).
  const areas = [
    CAMPUS_OUTLINE,
    ...BUILDINGS.filter((b) => SURROUNDINGS.alsoNear.includes(b.id)).flatMap((b) => b.parts.map((p) => p.footprint)),
  ];
  const nearby = osm.buildings.filter((b) => {
    const [x, z] = centroid(b.points);
    return areas.some((area) => distanceToPolygon(area, x, z) <= SURROUNDINGS.maxDistance);
  });
  const parts = nearby.map((b) => {
    const height = SURROUNDINGS.useRealLevels && b.levels ? b.levels * SURROUNDINGS.floorHeight : SURROUNDINGS.height;
    const ground = Math.min(...b.points.map(([x, z]) => heightAt(x, z)));
    const [cx, cz] = centroid(b.points);
    return extrudeFootprint(b.points, ground - 3, heightAt(cx, cz) + height);
  });
  return mergeGeometries(parts);
}

/** A flat polygon (parking lot etc.) lying on the ground at height y. */
export function flatPolygon(points, y) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}

/** All streets (from OpenStreetMap). */
export const buildStreets = (step = 4) => buildRibbons(osm.streets, 0.08, step);

/** Campus paths (PATHS in site.js), drawn just above the ground and the streets. */
export const buildPaths = (step = 4) => buildRibbons(PATHS, 0.15, step);

/** Stairs (STAIRS in site.js): one box per step, merged into one geometry. */
export function buildStairs() {
  const boxes = [];
  for (const st of STAIRS) {
    const [fx, fz] = st.from, [tx, tz] = st.to;
    const len = Math.hypot(tx - fx, tz - fz), dx = (tx - fx) / len, dz = (tz - fz) / len;
    const h0 = heightAt(fx, fz);
    const rise = st.rise ?? heightAt(tx, tz) - h0;
    const tread = len / st.steps;
    for (let i = 0; i < st.steps; i++) {
      const along = (i + 0.5) * tread, x = fx + dx * along, z = fz + dz * along;
      const top = h0 + (rise * (i + 1)) / st.steps + 0.25;
      const bottom = Math.min(heightAt(x, z), top - 0.3) - 0.3;
      const g = new THREE.BoxGeometry(st.width, top - bottom, tread);
      g.rotateY(Math.atan2(dx, dz)); // the box's length now runs from -> to
      g.translate(x, (top + bottom) / 2, z);
      boxes.push(g);
    }
  }
  return mergeGeometries(boxes);
}

/**
 * A flat shape draped over the hill. It is cut into small triangles so that its
 * corners follow the ground; `lift` = metres above the ground. Returns flat [x, y, z, ...].
 */
export function terrainPolygon(points, lift = 0.1, maxEdge = 2.5) {
  const contour = points.map(([x, z]) => new THREE.Vector2(x, z));
  const stack = THREE.ShapeUtils.triangulateShape(contour, []).map((f) => f.map((i) => points[i]));
  const positions = [];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  while (stack.length) {
    const t = stack.pop();
    const edges = [dist(t[0], t[1]), dist(t[1], t[2]), dist(t[2], t[0])];
    const longest = Math.max(...edges);
    if (longest > maxEdge) {
      const i = edges.indexOf(longest);
      const a = t[i], b = t[(i + 1) % 3], c = t[(i + 2) % 3];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      stack.push([a, mid, c], [mid, b, c]);
      continue;
    }
    let v = t.map(([x, z]) => [x, heightAt(x, z) + lift, z]);
    // make sure the triangle faces up
    const n = (v[1][2] - v[0][2]) * (v[2][0] - v[0][0]) - (v[1][0] - v[0][0]) * (v[2][2] - v[0][2]);
    if (n < 0) v = [v[0], v[2], v[1]];
    for (const p of v) positions.push(...p);
  }
  return positions;
}

/** All garden patches (PATCHES in site.js), merged into one geometry. */
export function buildPatches() {
  const positions = PATCHES.flatMap((p) => terrainPolygon(p.points, 0.1));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
