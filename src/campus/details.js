// Builders for the stage-3 details: roofs, windows, trees, terraces, amphitheater, courts.
// Everything is built once. Repeated things (windows, trees) are returned as lists of
// instances so each kind is drawn with a single InstancedMesh: cheap on phones.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLOOR_HEIGHT, WINDOWS } from './common.js';
import { centroid, insidePolygon, partHeights } from './geometry.js';

// Functions below that need a campus take its model `m` first (see src/campus/index.js).

// ── Shape helpers ──

/**
 * Smallest rectangle around a footprint, as centre, size and direction.
 * `length` runs along `u` (the long side), `width` along `v`.
 */
export function orientedBounds(points) {
  let best = null;
  points.forEach(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length];
    const a = Math.atan2(bz - az, bx - ax), c = Math.cos(a), s = Math.sin(a);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of points) {
      const u = x * c + z * s, v = -x * s + z * c;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) {
      const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
      best = { area, angle: a, a: u1 - u0, b: v1 - v0, cx: uc * c - vc * s, cz: uc * s + vc * c };
    }
  });
  // Make `u` the long side.
  const swap = best.b > best.a;
  const angle = swap ? best.angle + Math.PI / 2 : best.angle;
  return {
    cx: best.cx, cz: best.cz, angle,
    length: swap ? best.b : best.a,
    width: swap ? best.a : best.b,
    u: [Math.cos(angle), Math.sin(angle)],
    v: [-Math.sin(angle), Math.cos(angle)],
  };
}

/** Outward-facing normal of each footprint edge, plus the edge's ends and length. */
function edges(points) {
  return points.map(([ax, az], i) => {
    const [bx, bz] = points[(i + 1) % points.length];
    const len = Math.hypot(bx - ax, bz - az);
    let nx = (bz - az) / len, nz = -(bx - ax) / len;
    // Flip the normal if it points into the building.
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (insidePolygon(points, mx + nx * 0.5, mz + nz * 0.5)) { nx = -nx; nz = -nz; }
    return { ax, az, bx, bz, len, nx, nz };
  });
}

// ── Roofs ──

/** Hip roof over a part's bounding rectangle, sitting at height `top`. */
export function hipRoof(footprint, top, { overhang = 0.6, pitch = 0.32, maxHeight = 7 } = {}) {
  const { cx, cz, length, width, u, v } = orientedBounds(footprint);
  const L = length + overhang * 2, W = width + overhang * 2;
  const h = Math.min(W * pitch, maxHeight);
  const r = (L - W) / 2; // half the ridge length
  const p = (du, dv, y) => [cx + u[0] * du + v[0] * dv, y, cz + u[1] * du + v[1] * dv];
  const E1 = p(-L / 2, -W / 2, top), E2 = p(L / 2, -W / 2, top), E3 = p(L / 2, W / 2, top), E4 = p(-L / 2, W / 2, top);
  const R1 = p(-r, 0, top + h), R2 = p(r, 0, top + h);
  const tris = [E1, E2, R2, E1, R2, R1, E3, E4, R1, E3, R1, R2, E4, E1, R1, E2, E3, R2];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  geometry.computeVertexNormals();
  return { geometry, height: h };
}

/**
 * Sawtooth roof (Safadi Fine Arts): a row of triangular skylight "teeth".
 * The steep glass side of each tooth faces the default camera, as on the official map.
 * Returns the white teeth and, separately, the glass faces (drawn darker).
 */
export function sawtoothRoof(m, footprint, top, { teeth = 7, height = 3.4 } = {}) {
  const { cx, cz, length, width, u, v } = orientedBounds(footprint);
  const step = length / teeth;
  const depth = width * 0.92;
  // Which end of each tooth gets the steep glass face: the one facing the camera.
  const toCamera = [m.CAMERA.position[0] - m.CAMERA.target[0], m.CAMERA.position[2] - m.CAMERA.target[2]];
  const glassAtEnd = u[0] * toCamera[0] + u[1] * toCamera[1] > 0; // glass at local x = step
  const gx = glassAtEnd ? step : 0;

  // One tooth in local coordinates: x along u, y up, z along v.
  const tooth = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(step, 0), new THREE.Vector2(gx, height)]);
  const toothGeometry = new THREE.ExtrudeGeometry(tooth, { depth, bevelEnabled: false });
  const glassGeometry = new THREE.PlaneGeometry(depth, height * 0.9);
  glassGeometry.rotateY(glassAtEnd ? Math.PI / 2 : -Math.PI / 2); // face along ±u (local x)
  glassGeometry.translate(gx + (glassAtEnd ? 0.05 : -0.05), height * 0.45, depth / 2);

  const ux = new THREE.Vector3(u[0], 0, u[1]), up = new THREE.Vector3(0, 1, 0), vz = new THREE.Vector3(v[0], 0, v[1]);
  const teethParts = [], glassParts = [];
  for (let i = 0; i < teeth; i++) {
    const origin = new THREE.Vector3(cx, top, cz)
      .addScaledVector(ux, -length / 2 + i * step)
      .addScaledVector(vz, -depth / 2);
    const m = new THREE.Matrix4().makeBasis(ux, up, vz).setPosition(origin);
    teethParts.push(toothGeometry.clone().applyMatrix4(m));
    glassParts.push(glassGeometry.clone().applyMatrix4(m));
  }
  return { geometry: mergeGeometries(teethParts), glass: mergeGeometries(glassParts), height };
}

/** Tennis-court markings, drawn once into a small canvas texture. */
let courtTexture;
export function getCourtTexture() {
  if (courtTexture) return courtTexture;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3f7537'; g.fillRect(0, 0, 128, 256);
  g.strokeStyle = '#ffffff'; g.lineWidth = 3;
  g.strokeRect(14, 20, 100, 216);           // doubles outline
  g.strokeRect(26, 20, 76, 216);            // singles sidelines
  g.beginPath();
  g.moveTo(14, 128); g.lineTo(114, 128);    // net
  g.moveTo(26, 78); g.lineTo(102, 78);      // service lines
  g.moveTo(26, 178); g.lineTo(102, 178);
  g.moveTo(64, 78); g.lineTo(64, 178);      // centre service line
  g.stroke();
  courtTexture = new THREE.CanvasTexture(c);
  courtTexture.colorSpace = THREE.SRGBColorSpace;
  return courtTexture;
}

/**
 * Two tennis courts side by side on a raised slab, centred on a deck.
 * length / width = size of one court; raise = height of the slab above the deck;
 * margin = border of the slab around the courts; gap = space between the two courts. (metres)
 * Returns the court planes and the slab (a box).
 */
export function courtsLayout(footprint, top, { length = 20, width = 9, raise = 1.2, margin = 1.2, gap = 0.4 } = {}) {
  const { cx, cz, angle, v } = orientedBounds(footprint);
  const rotationY = Math.PI / 2 - angle; // turns the long side to run along the deck's long axis
  const offset = width / 2 + gap / 2;
  const courts = [-1, 1].map((side) => ({
    position: [cx + v[0] * side * offset, top + raise + 0.06, cz + v[1] * side * offset],
    rotationY,
    size: [width, length],
  }));
  const slab = { position: [cx, top + raise / 2, cz], rotationY, size: [2 * width + gap + 2 * margin, raise, length + 2 * margin] };
  return { courts, slab };
}

// ── Windows and bands ──

/**
 * Window and band instances for every building, using each style's `windows` setting:
 *   'grid'   a window per bay per floor
 *   'ribbon' a continuous strip of glass per floor
 *   'none'   no windows
 * Styles with `bands: true` also get a coloured band (accent colour) under each floor.
 * Windows and glass strips have `lit: true` if they glow at night (see NIGHT_WINDOWS).
 */
export function buildFacadeInstances(m) {
  const { BUILDINGS, STYLES, NIGHT_WINDOWS, heightAt } = m;
  const windows = []; // { position, rotationY, color, lit }
  const bands = [];   // { position, rotationY, length, height, color, lit }
  const rand = random(33);
  for (const b of BUILDINGS) {
    if (b.underground) continue;
    for (const part of b.parts) {
      const style = STYLES[part.style ?? b.style];
      const mode = style.windows ?? 'grid';
      if (mode === 'none' && !style.bands) continue;
      const fh = part.floorHeight ?? FLOOR_HEIGHT;
      const { top } = partHeights(m, part);

      for (const e of edges(part.footprint)) {
        if (e.len < WINDOWS.minWall) continue;
        const rotationY = Math.atan2(e.nx, e.nz);
        const mx = (e.ax + e.bx) / 2, mz = (e.az + e.bz) / 2;
        const ground = heightAt(mx, mz);
        const floors = Math.min(Math.floor((top - ground - 0.5) / fh), part.floors + 4);
        const out = 0.08; // just in front of the wall

        for (let f = 0; f < floors; f++) {
          const floorY = top - (f + 1) * fh; // count floors down from the roof
          if (floorY < ground - 0.5) break;

          if (mode === 'grid') {
            const cols = Math.max(1, Math.floor(e.len / WINDOWS.spacing));
            for (let c = 0; c < cols; c++) {
              const t = (c + 0.5) / cols;
              windows.push({
                position: [e.ax + (e.bx - e.ax) * t + e.nx * out, floorY + fh * 0.55, e.az + (e.bz - e.az) * t + e.nz * out],
                rotationY,
                color: style.window ?? WINDOWS.color,
                lit: rand() < NIGHT_WINDOWS.litShare,
              });
            }
          } else if (mode === 'ribbon') {
            bands.push({
              position: [mx + e.nx * out, floorY + fh * 0.55, mz + e.nz * out],
              rotationY, length: e.len * 0.94, height: fh * 0.45, color: style.window ?? WINDOWS.color,
              lit: rand() < NIGHT_WINDOWS.litShareRibbon,
            });
          }
          if (style.bands) {
            bands.push({
              position: [mx + e.nx * out * 2, floorY + 0.25, mz + e.nz * out * 2],
              rotationY, length: e.len, height: 0.5, color: style.accent, lit: false,
            });
          }
        }
      }
    }
  }
  return { windows, bands };
}

// ── Trees ──

// Small seeded random generator, so trees appear in the same places on every load.
function random(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Things trees and lamps must keep clear of, worked out once per campus.
const derivedCache = new WeakMap();
function derived(m) {
  if (!derivedCache.has(m)) {
    const { BUILDINGS, HANGOUT_DECOR, PATHS, STAIRS } = m;
    // Every point where a hangout decoration stands (trees are kept away from these).
    const decorPoints = Object.values(HANGOUT_DECOR).flatMap((d) => [
      ...(d.benches ?? []).map(([x, z]) => [x, z]),
      ...(d.shrubs ?? []),
      ...[d.kiosk, d.fountain, d.featureTree, d.grass, d.catHouse, d.pergola, d.waterfall].filter(Boolean).map((o) => o.at),
    ]);
    // Paths and stairs as line segments.
    const stairLines = STAIRS.map((st) => ({ width: st.width, points: [st.from, st.to] }));
    derivedCache.set(m, {
      insideAnyBuilding: (x, z) => BUILDINGS.some((bd) => bd.parts.some((p) => insidePolygon(p.footprint, x, z))),
      nearDecor: (x, z, r = 4.5) => decorPoints.some(([dx, dz]) => Math.hypot(x - dx, z - dz) < r),
      walkways: [...PATHS.map((p) => ({ width: p.width, points: p.points })), ...stairLines],
      stairLines,
    });
  }
  return derivedCache.get(m);
}

function nearWalkway(lines, x, z, margin = 1.5) {
  return lines.some(({ width, points }) =>
    points.slice(0, -1).some(([ax, az], i) => {
      const [bx, bz] = points[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      return Math.hypot(x - (ax + t * dx), z - (az + t * dz)) < width / 2 + margin;
    })
  );
}

/** Tree positions and sizes from the clusters and rows in site.js. */
export function buildTreeInstances(m) {
  const { TREES, PATCHES, heightAt } = m;
  const { insideAnyBuilding, nearDecor, walkways } = derived(m);
  const rand = random(7);
  const trees = [];
  const add = (x, z) => {
    if (insideAnyBuilding(x, z) || nearDecor(x, z) || nearWalkway(walkways, x, z) || PATCHES.some((p) => insidePolygon(p.points, x, z))) return;
    const size = 0.8 + rand() * 0.5;
    trees.push({ position: [x, heightAt(x, z), z], size, shade: rand() });
  };
  for (const c of TREES.clusters) {
    for (let i = 0; i < c.count; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * c.radius;
      add(c.center[0] + Math.cos(a) * r, c.center[1] + Math.sin(a) * r);
    }
  }
  for (const row of TREES.rows) {
    for (let i = 0; i < row.count; i++) {
      const t = row.count === 1 ? 0.5 : i / (row.count - 1);
      add(row.from[0] + (row.to[0] - row.from[0]) * t, row.from[1] + (row.to[1] - row.from[1]) * t);
    }
  }
  return trees;
}

// ── Lamp posts ──

/**
 * Where the lamp posts stand: every LAMPS.spacing metres along each path, alternating sides,
 * plus one by each gate. Returns [x, z] pairs. Lamps never land in a building, on stairs, or
 * close to another lamp (paths cross, so this also stops doubles at junctions).
 */
export function buildLampPositions(m) {
  const { PATHS, GATES, LAMPS } = m;
  const { insideAnyBuilding, stairLines } = derived(m);
  const lamps = [];
  const add = (x, z) => {
    if (insideAnyBuilding(x, z) || nearWalkway(stairLines, x, z, 0.5)) return;
    if (lamps.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < LAMPS.spacing * 0.6)) return;
    lamps.push([x, z]);
  };
  let side = 1;
  for (const { width, points } of PATHS) {
    let next = LAMPS.spacing / 2; // distance along the path to the next lamp
    let walked = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i], [bx, bz] = points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      for (; next <= walked + len; next += LAMPS.spacing) {
        const t = (next - walked) / len;
        const away = width / 2 + LAMPS.sideOffset;
        add(ax + (bx - ax) * t + (-(bz - az) / len) * away * side, az + (bz - az) * t + ((bx - ax) / len) * away * side);
        side = -side;
      }
      walked += len;
    }
  }
  for (const gate of GATES) add(gate.position[0] + LAMPS.gateOffset[0], gate.position[1] + LAMPS.gateOffset[1]);
  return lamps;
}

// ── Terraces and amphitheater ──

/** Stepped green terraces: one block per step, grass on top (group 0) and stone sides (group 1). */
export function buildTerraces(m) {
  const { TERRACES, heightAt } = m;
  if (!TERRACES) return [];
  const { x: [x0, x1], z: [z0, z1], steps } = TERRACES;
  const depth = (z1 - z0) / steps;
  const parts = [];
  for (let i = 0; i < steps; i++) {
    const front = z0 + i * depth, back = front + depth;
    const topY = heightAt(0, back) + 0.6;
    const shape = new THREE.Shape([
      new THREE.Vector2(x0, -front), new THREE.Vector2(x1, -front), new THREE.Vector2(x1, -back), new THREE.Vector2(x0, -back),
    ]);
    const bottom = heightAt(0, front) - 1;
    const g = new THREE.ExtrudeGeometry(shape, { depth: topY - bottom, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bottom, 0);
    parts.push(g);
  }
  return parts; // kept separate so each keeps its grass/wall face groups
}

/** Half-round amphitheater: rising rings of seats around a small stage, open to the north. */
export function buildAmphitheater(m) {
  const { AMPHITHEATER, heightAt } = m;
  if (!AMPHITHEATER) return null;
  const { center: [cx, cz], radius, tiers } = AMPHITHEATER;
  const ground = heightAt(cx, cz);
  const ring = radius / (tiers + 1);
  const parts = [];
  for (let i = 0; i < tiers; i++) {
    const r0 = ring * (i + 1), r1 = ring * (i + 2);
    // In shape space y = -z, so the southern half (z > 0) is angles π..2π.
    const shape = new THREE.Shape();
    shape.absarc(cx, -cz, r1, Math.PI, Math.PI * 2, false);
    shape.absarc(cx, -cz, r0, Math.PI * 2, Math.PI, true);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.45 * (i + 1) + 0.3, bevelEnabled: false, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, ground - 0.3, 0);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

// ── Hangout spot decorations ──

/** Box helper: a box of size (w, h, d) whose bottom centre sits at (x, y, z). */
function box(w, h, d, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  return g;
}

/** One bench (seat, backrest, two legs) as a single geometry, facing +z. */
export function benchGeometry() {
  return mergeGeometries([
    box(1.8, 0.1, 0.5, 0, 0.42, 0),       // seat
    box(1.8, 0.45, 0.08, 0, 0.55, -0.22), // backrest
    box(0.1, 0.42, 0.45, -0.75, 0, 0),    // legs
    box(0.1, 0.42, 0.45, 0.75, 0, 0),
  ]);
}

/**
 * All hangout decorations from HANGOUT_DECOR, grouped by kind:
 *   benches / shrubs: instance lists (one InstancedMesh each)
 *   kiosk, awning, stone, water, trunk, crown: merged geometries (one mesh each)
 */
export function buildHangoutDecor(m) {
  const { HANGOUT_DECOR, heightAt } = m;
  const benches = [], shrubs = [];
  const kiosk = [], awning = [], stone = [], water = [], trunk = [], crowns = [];
  const grass = [], catHouse = [], catRoof = [], wood = [], vine = [], rock = [];
  for (const d of Object.values(HANGOUT_DECOR)) {
    for (const [x, z, angle = 0] of d.benches ?? []) {
      benches.push({ position: [x, heightAt(x, z), z], rotationY: (-angle * Math.PI) / 180 });
    }
    for (const [x, z] of d.shrubs ?? []) shrubs.push({ position: [x, heightAt(x, z), z] });

    if (d.kiosk) {
      const [x, z] = d.kiosk.at, y = heightAt(x, z), a = (-(d.kiosk.angle ?? 0) * Math.PI) / 180;
      const place = (g) => g.rotateY(a).translate(x, y, z);
      kiosk.push(place(box(3.2, 2.6, 2.4)));
      const roof = box(3.8, 0.15, 1.6, 0, 0, 0);
      roof.rotateX(0.35);
      roof.translate(0, 2.6, 1.5);
      awning.push(place(roof));
      awning.push(place(box(3.4, 0.2, 2.6, 0, 2.6, 0))); // flat top
    }
    if (d.fountain) {
      const [x, z] = d.fountain.at, y = heightAt(x, z), r = d.fountain.radius;
      stone.push(new THREE.CylinderGeometry(r, r, 0.3, 28).translate(x, y + 0.15, z));                  // basin floor
      stone.push(new THREE.TorusGeometry(r - 0.1, 0.18, 8, 28).rotateX(Math.PI / 2).translate(x, y + 0.4, z)); // rim
      stone.push(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 10).translate(x, y + 0.85, z));            // pedestal
      stone.push(new THREE.CylinderGeometry(0.9, 0.6, 0.25, 16).translate(x, y + 1.55, z));             // upper bowl
      water.push(new THREE.CylinderGeometry(r - 0.15, r - 0.15, 0.06, 28).translate(x, y + 0.36, z));    // water in the basin
      water.push(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 16).translate(x, y + 1.7, z));             // water in the bowl
    }
    if (d.grass) {
      const [x, z] = d.grass.at;
      const g = new THREE.CircleGeometry(1, 28);
      g.rotateX(-Math.PI / 2);
      g.scale(d.grass.size[0], 1, d.grass.size[1]);
      g.translate(x, heightAt(x, z) + 0.12, z);
      grass.push(g);
    }
    if (d.catHouse) {
      const [x, z] = d.catHouse.at, y = heightAt(x, z), a = (-(d.catHouse.angle ?? 0) * Math.PI) / 180;
      catHouse.push(box(1.5, 0.9, 1.2).rotateY(a).translate(x, y, z));
      catRoof.push(new THREE.ConeGeometry(1.25, 0.7, 4).rotateY(Math.PI / 4).translate(0, 1.25, 0).rotateY(a).translate(x, y, z));
    }
    if (d.pergola) {
      const [x, z] = d.pergola.at, [L, W] = d.pergola.size, y = heightAt(x, z);
      const a = (-(d.pergola.angle ?? 0) * Math.PI) / 180, H = 2.6;
      const place = (g) => g.rotateY(a).translate(x, y, z);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) wood.push(place(box(0.22, H, 0.22, sx * (L / 2 - 0.15), 0, sz * (W / 2 - 0.15)))); // posts
      for (const sz of [-1, 1]) wood.push(place(box(L, 0.18, 0.2, 0, H, sz * (W / 2 - 0.15))));                                           // long beams
      const n = Math.round(L / 0.8);
      for (let i = 0; i <= n; i++) wood.push(place(box(0.1, 0.08, W + 0.5, -L / 2 + (L * i) / n, H + 0.18, 0)));                             // cross slats
      vine.push(place(box(L - 0.4, 0.3, W - 0.4, 0, H + 0.26, 0)));                                                                         // leafy cover
      for (const [fx, fz, r] of [[-L * 0.3, -W * 0.3, 0.9], [0, W * 0.3, 1], [L * 0.3, -W * 0.2, 0.9]]) {
        vine.push(place(new THREE.IcosahedronGeometry(r, 0).translate(fx, H + 0.7, fz)));
      }
      for (const sx of [-1, 1]) vine.push(place(box(0.3, 1.3, W - 0.6, sx * (L / 2 - 0.2), H - 1.2, 0)));                                  // hanging vine
    }
    if (d.waterfall) {
      // Local axes: the pool and the falling water are toward +z.
      const [x, z] = d.waterfall.at, y = heightAt(x, z), a = (-(d.waterfall.angle ?? 0) * Math.PI) / 180;
      const put = (g) => g.rotateY(a).translate(x, y, z);
      for (const [rx, ry, rz, r, sx, sy] of [
        [-1.0, 0.6, -0.7, 1.1, 1.3, 0.9], [0.9, 0.55, -0.8, 1.0, 1.2, 0.85], [0, 1.25, -0.9, 0.9, 1.1, 0.9],
        [-1.9, 0.3, 0.6, 0.5, 1, 0.7], [1.9, 0.3, 0.9, 0.45, 1, 0.7], [-1.1, 0.25, 2.9, 0.4, 1, 0.7], [1.2, 0.25, 3.0, 0.4, 1, 0.7],
      ]) {
        rock.push(put(new THREE.IcosahedronGeometry(r, 0).scale(sx, sy, 1).translate(rx, ry, rz)));
      }
      water.push(put(new THREE.CylinderGeometry(1.9, 1.9, 0.06, 20).translate(0, 0.2, 1.6))); // pool
      water.push(put(box(0.9, 1.6, 0.14, 0.1, 0.3, 0.3)));                                    // falling water
    }
    if (d.featureTree) {
      const [x, z] = d.featureTree.at, y = heightAt(x, z), s = d.featureTree.size;
      trunk.push(new THREE.CylinderGeometry(0.35 * s, 0.55 * s, 4 * s, 7).translate(x, y + 2 * s, z));
      // Three overlapping rounded crowns make a wide, full canopy.
      for (const [dx, dy, dz, r] of [[0, 5.2, 0, 2.6], [1.8, 4.5, 0.8, 2], [-1.6, 4.6, -0.9, 2.1]]) {
        crowns.push(new THREE.IcosahedronGeometry(r * s, 1).translate(x + dx * s, y + dy * s, z + dz * s));
      }
    }
  }
  // Boxes are "indexed" and icosahedrons are not; merging needs them all the same.
  const merge = (list) => (list.length ? mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g))) : null);
  return {
    benches, shrubs,
    kiosk: merge(kiosk), awning: merge(awning), stone: merge(stone), water: merge(water),
    trunk: merge(trunk), crown: merge(crowns), pergola: merge(wood), vine: merge(vine), rock: merge(rock),
    grass: merge(grass), catHouse: merge(catHouse), catRoof: merge(catRoof),
  };
}

/** Roof/ground height of the tallest part of a building (for labels and "top" extras). */
export function buildingTop(m, building) {
  return Math.max(...building.parts.map((p) => partHeights(m, p).top));
}

export { centroid };

// ── Garden patches: bushes and flowers ──
const FLOWER_COLORS = ['#e0455a', '#f2c230', '#f5f5f0', '#a259d1'];

/** Bushes and flower clumps for every patch (same places on every load). */
export function buildPatchPlants(m) {
  const { PATCHES, heightAt } = m;
  const { walkways } = derived(m);
  const rand = random(21);
  const shrubs = [], flowers = [];
  for (const patch of PATCHES) {
    const xs = patch.points.map((p) => p[0]), zs = patch.points.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    // A random spot inside the patch, off the paths.
    const spot = () => {
      for (let tries = 0; tries < 80; tries++) {
        const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0);
        if (insidePolygon(patch.points, x, z) && !nearWalkway(walkways, x, z, 0.8)) return [x, z];
      }
      return null;
    };
    for (let i = 0; i < (patch.shrubs ?? 0); i++) {
      const p = spot();
      if (p) shrubs.push({ position: [p[0], heightAt(p[0], p[1]), p[1]], size: 0.7 + rand() * 0.5, shade: rand() });
    }
    for (let i = 0; i < (patch.flowers ?? 0); i++) {
      const p = spot();
      if (!p) continue;
      const color = FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)];
      for (let k = 0; k < 3; k++) {
        flowers.push({ position: [p[0] + (rand() - 0.5) * 0.9, heightAt(p[0], p[1]) + 0.3, p[1] + (rand() - 0.5) * 0.9], color });
      }
    }
  }
  return { shrubs, flowers };
}
