// Turns the plain numbers in a campus's buildings.js / site.js into Three.js geometry.
// Everything here is built once and cached; nothing is recreated per frame.
//
// Functions that need a campus take its model `m` first (see src/campus/index.js):
// m.BUILDINGS, m.heightAt, m.BOUNDS and so on. Beirut and Byblos share all of this code.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLOOR_HEIGHT } from './common.js';

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
 * the ground at the part's centre. `below` (optional) = floors of `floors` that are
 * below that ground (a lobby level above them), so they only show on the downhill side.
 */
export function partHeights(m, part) {
  let ground = Math.min(...part.footprint.map(([x, z]) => m.heightAt(x, z)));
  if (m.BUILDING_BASE === 'terrain') ground = Math.min(ground, lowestAround(m, part.footprint));
  const [cx, cz] = centroid(part.footprint);
  const top = m.heightAt(cx, cz) + (part.floors - (part.below ?? 0)) * (part.floorHeight ?? FLOOR_HEIGHT);
  return { bottom: ground - 3, top };
}

/** The lowest ground along a footprint's edge, and 1.5 m outside it (so the base reaches below the slope on the downhill side). */
function lowestAround(m, points) {
  let low = Infinity;
  const [cx, cz] = centroid(points);
  points.forEach(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
    for (let k = 0; k < n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n, d = Math.hypot(x - cx, z - cz) || 1;
      low = Math.min(low, m.heightAt(x, z), m.heightAt(x + ((x - cx) / d) * 1.5, z + ((z - cz) / d) * 1.5));
    }
  });
  return low;
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

/**
 * The ground: a grid that follows the slope. It is coloured light inside the campus: inside the
 * CAMPUS_OUTLINE polygon, or (if the campus has a `groundMask`) fading from forest green to stone.
 */
export function buildTerrain(m, step = m.TERRAIN_STEP ?? 4) {
  const { BOUNDS, CAMPUS_OUTLINE, COLORS, heightAt, groundMask } = m;
  const width = BOUNDS.maxX - BOUNDS.minX, depth = BOUNDS.maxZ - BOUNDS.minZ;
  const geometry = new THREE.PlaneGeometry(width, depth, Math.round(width / step), Math.round(depth / step));
  geometry.rotateX(-Math.PI / 2); // lie flat; plane y becomes -z
  geometry.translate(BOUNDS.minX + width / 2, 0, BOUNDS.minZ + depth / 2);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const inside = new THREE.Color(COLORS.campusGround), outside = new THREE.Color(groundMask ? COLORS.forest : COLORS.background);
  const mixed = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    if (groundMask) mixed.copy(outside).lerp(inside, groundMask(x, z)).toArray(colors, i * 3);
    else (insidePolygon(CAMPUS_OUTLINE, x, z) ? inside : outside).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Flat ribbons ({ width, points }) following the slope, merged into one geometry. `lift` = metres above the ground. */
function buildRibbons(m, items, lift, step = 4) {
  const { heightAt } = m;
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
      let a1 = [ax - ex + nx, ya, az - ez + nz], a2 = [ax - ex - nx, ya, az - ez - nz];
      let b1 = [bx + ex + nx, yb, bz + ez + nz], b2 = [bx + ex - nx, yb, bz + ez - nz];
      if (m.RIBBON_ON_GROUND) {
        // Each corner takes the height of the ground under it, so the ribbon lies on a cross slope instead of sinking into one side.
        [a1, a2, b1, b2].forEach((v) => { v[1] = heightAt(v[0], v[2]) + lift; });
      }
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

/** Neighbouring city buildings near the campus as plain blocks, merged into one geometry (or null if there are none). */
export function buildSurroundings(m) {
  const { BUILDINGS, CAMPUS_OUTLINE, SURROUNDINGS, heightAt, osm } = m;
  if (!SURROUNDINGS || !osm.buildings.length) return null;
  // Areas to draw neighbours around: the campus, plus LAU buildings outside it (Gezairi).
  const areas = [
    CAMPUS_OUTLINE,
    ...BUILDINGS.filter((b) => SURROUNDINGS.alsoNear.includes(b.id)).flatMap((b) => b.parts.map((p) => p.footprint)),
  ];
  const nearby = osm.buildings.filter((b) => {
    const [x, z] = centroid(b.points);
    return areas.some((area) => distanceToPolygon(area, x, z) <= SURROUNDINGS.maxDistance);
  });
  if (!nearby.length) return null;
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

/** All streets (from OpenStreetMap), plus the campus's own access roads (DRIVES in site.js) if it has any. */
export const buildStreets = (m, step = 4) => buildRibbons(m, [...m.osm.streets, ...(m.DRIVES ?? [])], m.LIFTS?.street ?? 0.08, step);

/** Campus paths (PATHS in site.js), drawn just above the ground and the streets. */
export const buildPaths = (m, step = 4) => buildRibbons(m, m.PATHS, m.LIFTS?.path ?? 0.15, step);

/** Number of steps of a flight: its `steps` if it has them, else one for every 17 cm of climb. */
export function stairSteps(m, st) {
  if (st.steps) return st.steps;
  const rise = Math.abs((st.rise ?? m.heightAt(...st.to) - m.heightAt(...st.from)));
  return Math.max(2, Math.ceil(rise / 0.17));
}

/** Stairs (STAIRS in site.js): one box per step, merged into one geometry (or null if there are none). */
export function buildStairs(m) {
  const { heightAt } = m;
  const boxes = [];
  for (const st of m.STAIRS) {
    const [fx, fz] = st.from, [tx, tz] = st.to;
    const len = Math.hypot(tx - fx, tz - fz), dx = (tx - fx) / len, dz = (tz - fz) / len;
    const h0 = heightAt(fx, fz);
    const rise = st.rise ?? heightAt(tx, tz) - h0;
    const steps = stairSteps(m, st);
    const tread = len / steps;
    for (let i = 0; i < steps; i++) {
      const along = (i + 0.5) * tread, x = fx + dx * along, z = fz + dz * along;
      const top = h0 + (rise * (i + 1)) / steps + 0.25;
      const bottom = Math.min(heightAt(x, z), top - 0.3) - 0.3;
      const g = new THREE.BoxGeometry(st.width, top - bottom, tread);
      g.rotateY(Math.atan2(dx, dz)); // the box's length now runs from -> to
      g.translate(x, (top + bottom) / 2, z);
      boxes.push(g);
    }
  }
  return boxes.length ? mergeGeometries(boxes) : null;
}

/**
 * A flat shape draped over the hill. It is cut into small triangles so that its
 * corners follow the ground; `lift` = metres above the ground. Returns flat [x, y, z, ...].
 */
export function terrainPolygon(m, points, lift = 0.1, maxEdge = 2.5) {
  const { heightAt } = m;
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
export function buildPatches(m) {
  const positions = m.PATCHES.flatMap((p) => terrainPolygon(m, p.points, m.LIFTS?.patch ?? 0.1));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Parking lots laid over the slope (campuses with DRAPE_PARKING), one geometry per lot: [{ lot, geometry }]. */
export function buildDrapedLots(m, lots = m.PARKING) {
  return lots.map((lot) => {
    const g = new THREE.BufferGeometry();
    // Only the part of the lot on ground a car could stand on: pieces on a slope steeper than about 35% (a cliff or embankment edge) are left out.
    const all = terrainPolygon(m, lot.area, m.LIFTS?.parking ?? 0.3, 3), kept = [];
    for (let t = 0; t < all.length; t += 9) {
      const ys = [all[t + 1], all[t + 4], all[t + 7]];
      if (Math.max(...ys) - Math.min(...ys) <= 1.0) kept.push(...all.slice(t, t + 9));
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
    g.computeVertexNormals();
    return { lot, geometry: g };
  });
}

/** Distance from a point to the nearest road, path or stair of the campus, minus half its width (negative: on it). */
function distanceToNetwork(m, x, z) {
  let best = Infinity;
  const lines = [...m.osm.streets, ...(m.DRIVES ?? []), ...m.PATHS].map((l) => ({ w: l.width, pts: l.points }));
  lines.push(...m.STAIRS.map((st) => ({ w: st.width, pts: [st.from, st.to] })));
  for (const { w, pts } of lines) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)) - w / 2);
    }
  }
  return best;
}

/**
 * Retaining walls (WALLS and WALL_PADS in site.js): stone blocks along the edge of a pad where the ground falls away sharply,
 * with a level top and a vertical outer face. Returns { top, face } geometries (or null): the cap colour and the wall colour.
 */
export function buildWalls(m) {
  const { WALLS, WALL_PADS, heightAt } = m;
  if (!WALLS) return null;
  const top = [], face = [];
  const quad = (out, a, b, c, d) => out.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (const pad of WALL_PADS) {
    const pts = pad.points;
    pts.forEach(([ax, az], i) => {
      const [bx, bz] = pts[(i + 1) % pts.length], len = Math.hypot(bx - ax, bz - az);
      if (len < 1) return;
      const ux = (bx - ax) / len, uz = (bz - az) / len;
      let nx = uz, nz = -ux;
      if (insidePolygon(pts, (ax + bx) / 2 + nx * 0.5, (az + bz) / 2 + nz * 0.5)) { nx = -nx; nz = -nz; }
      const n = Math.max(1, Math.ceil(len / 2));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n;
        const at = (t, d) => [ax + (bx - ax) * t + nx * d, az + (bz - az) * t + nz * d];
        const drop = pad.y - heightAt(...at((t0 + t1) / 2, WALLS.to + 1));
        if (drop < WALLS.minDrop || heightAt(...at((t0 + t1) / 2, WALLS.from)) < pad.y - 1.5) continue; // not a sharp step, or not this pad's edge
        const clear = [t0, t1].every((t) => [WALLS.from, (WALLS.from + WALLS.to) / 2, WALLS.to].every((d) => distanceToNetwork(m, ...at(t, d)) > 2.5));
        if (!clear) continue;
        const [i0, i1] = [at(t0, WALLS.from), at(t1, WALLS.from)], [o0, o1] = [at(t0, WALLS.to), at(t1, WALLS.to)];
        const y = pad.y + 0.15;
        const b0 = heightAt(...at(t0, WALLS.to + 1)) - 0.6, b1 = heightAt(...at(t1, WALLS.to + 1)) - 0.6;
        quad(top, [i0[0], y, i0[1]], [o0[0], y, o0[1]], [o1[0], y, o1[1]], [i1[0], y, i1[1]]);
        quad(face, [o0[0], y, o0[1]], [o0[0], b0, o0[1]], [o1[0], b1, o1[1]], [o1[0], y, o1[1]]);
      }
    });
  }
  if (!top.length) return null;
  const make = (positions) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  };
  return { top: make(top), face: make(face) };
}
