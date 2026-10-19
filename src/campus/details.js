// Builders for the stage-3 details: roofs, windows, trees, terraces, amphitheater, courts.
// Everything is built once. Repeated things (windows, trees) are returned as lists of
// instances so each kind is drawn with a single InstancedMesh: cheap on phones.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BUILDINGS, FLOOR_HEIGHT, STYLES, WINDOWS } from './buildings.js';
import { heightAt, CAMERA, TREES, TERRACES, AMPHITHEATER } from './site.js';
import { centroid, insidePolygon, partHeights } from './geometry.js';

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
export function sawtoothRoof(footprint, top, { teeth = 7, height = 3.4 } = {}) {
  const { cx, cz, length, width, u, v } = orientedBounds(footprint);
  const step = length / teeth;
  const depth = width * 0.92;
  // Which end of each tooth gets the steep glass face: the one facing the camera.
  const toCamera = [CAMERA.position[0] - CAMERA.target[0], CAMERA.position[2] - CAMERA.target[2]];
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

/** Positions of the courts on a deck: two side by side, long side along the deck's `u`. */
export function courtsLayout(footprint, top) {
  const { cx, cz, angle, v, length, width } = orientedBounds(footprint);
  // Courts run along whichever side is longer; two fit side by side across the other.
  const courtW = Math.min(13, width / 2 - 1), courtL = Math.min(26, length - 2);
  return [-1, 1].map((side) => ({
    position: [cx + v[0] * side * (courtW / 2 + 0.5), top + 0.06, cz + v[1] * side * (courtW / 2 + 0.5)],
    rotationY: Math.PI / 2 - angle, // turns the court's long side to run along u
    size: [courtW, courtL],
  }));
}

// ── Windows and bands ──

/**
 * Window and band instances for every building, using each style's `windows` setting:
 *   'grid'   a window per bay per floor
 *   'ribbon' a continuous strip of glass per floor
 *   'none'   no windows
 * Styles with `bands: true` also get a coloured band (accent colour) under each floor.
 */
export function buildFacadeInstances() {
  const windows = []; // { position, rotationY, color }
  const bands = [];   // { position, rotationY, length, height, color }
  for (const b of BUILDINGS) {
    if (b.underground) continue;
    for (const part of b.parts) {
      const style = STYLES[part.style ?? b.style];
      const mode = style.windows ?? 'grid';
      if (mode === 'none' && !style.bands) continue;
      const fh = part.floorHeight ?? FLOOR_HEIGHT;
      const { top } = partHeights(part);

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
              });
            }
          } else if (mode === 'ribbon') {
            bands.push({
              position: [mx + e.nx * out, floorY + fh * 0.55, mz + e.nz * out],
              rotationY, length: e.len * 0.94, height: fh * 0.45, color: style.window ?? WINDOWS.color,
            });
          }
          if (style.bands) {
            bands.push({
              position: [mx + e.nx * out * 2, floorY + 0.25, mz + e.nz * out * 2],
              rotationY, length: e.len, height: 0.5, color: style.accent,
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

const insideAnyBuilding = (x, z) =>
  BUILDINGS.some((b) => b.parts.some((p) => insidePolygon(p.footprint, x, z)));

/** Tree positions and sizes from the clusters and rows in site.js. */
export function buildTreeInstances() {
  const rand = random(7);
  const trees = [];
  const add = (x, z) => {
    if (insideAnyBuilding(x, z)) return;
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

// ── Terraces and amphitheater ──

/** Stepped green terraces: one block per step, grass on top (group 0) and stone sides (group 1). */
export function buildTerraces() {
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
export function buildAmphitheater() {
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

/** Roof/ground height of the tallest part of a building (for labels and "top" extras). */
export function buildingTop(building) {
  return Math.max(...building.parts.map((p) => partHeights(p).top));
}

export { centroid };
