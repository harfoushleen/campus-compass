// The land, sea and old town beyond the campus's edge (only campuses with a SEA setting, i.e. Byblos).
//   - the hillside: a ground skirt around the scene that carries on at the edge's height, falling away
//     a little to the north, south and east and running down to the coast in the west;
//   - the Mediterranean: one flat plane to the horizon;
//   - Old Byblos: a low cluster of blocks with a castle keep.
// All in a few merged meshes. Settings: SEA in the campus's site.js.
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useModel } from './model.js';

const noRaycast = () => null;

const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * One side of the skirt: a grid whose near row follows the scene's edge and whose far rows fall away.
 * `edge(t)` gives the point [x, z] on the edge for t = 0..1 along it, `out` the outward direction [dx, dz],
 * `length` how far it reaches, and `fall(d)` how much lower than the edge the ground is at distance d.
 */
function skirtSide(m, { from, to, out, length, fall, rowStep = 10 }) {
  const { heightAt, BOUNDS } = m;
  const clampX = (x) => Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, x));
  const clampZ = (z) => Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, z));
  const span = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const cols = Math.max(2, Math.round(span / rowStep));
  const rows = 24;
  const positions = [];
  for (let r = 0; r <= rows; r++) {
    const d = r === 0 ? 1 : length * (r / rows) ** 1.7; // finer near the campus
    for (let c = 0; c <= cols; c++) {
      const t = c / cols;
      const ex = from[0] + (to[0] - from[0]) * t, ez = from[1] + (to[1] - from[1]) * t;
      const edgeY = heightAt(clampX(ex), clampZ(ez)) - 0.5;
      positions.push(ex + out[0] * d, edgeY - fall(d, edgeY), ez + out[1] * d);
    }
  }
  const index = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1;
      index.push(a, d, b, b, d, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

function buildSkirt(m) {
  const { BOUNDS: B, SEA } = m;
  const far = SEA.span;
  const gentle = (d) => 40 * smooth(d / 3000); // north, south and east: slowly falling forest
  const toCoast = (d, edgeY) => (edgeY - SEA.level) * smooth(d / (B.minX - SEA.coastX)); // west: down to the sea
  return mergeGeometries([
    skirtSide(m, { from: [B.minX, B.minZ], to: [B.maxX, B.minZ], out: [0, -1], length: far, fall: gentle }),   // north
    skirtSide(m, { from: [B.minX, B.maxZ], to: [B.maxX, B.maxZ], out: [0, 1], length: far, fall: gentle }),    // south
    skirtSide(m, { from: [B.maxX, -far], to: [B.maxX, far], out: [1, 0], length: far, fall: gentle, rowStep: 40 }), // east
    skirtSide(m, { from: [B.minX, -far], to: [B.minX, far], out: [-1, 0], length: B.minX - SEA.coastX, fall: toCoast, rowStep: 40 }), // west, to the coast
  ].map((g) => g.toNonIndexed()));
}

/** Old Byblos: a cluster of low sand-coloured blocks with a squat castle keep, standing just above the water. */
function buildOldTown(m) {
  const { SEA } = m;
  const { center: [cx, cz], radius, count } = SEA.oldTown;
  let s = 11;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius;
    const w = 14 + rand() * 22, d = 14 + rand() * 22, h = 6 + rand() * 10;
    parts.push(new THREE.BoxGeometry(w, h, d).translate(cx + Math.cos(a) * r, SEA.oldTown.baseY + h / 2, cz + Math.sin(a) * r * 0.8));
  }
  // The castle keep.
  parts.push(new THREE.BoxGeometry(40, 26, 40).translate(cx + radius * 0.35, SEA.oldTown.baseY + 13, cz - radius * 0.1));
  return mergeGeometries(parts);
}

export default function Sea() {
  const m = useModel();
  const { SEA } = m;
  const skirt = useMemo(() => (SEA ? buildSkirt(m) : null), [m, SEA]);
  const town = useMemo(() => (SEA ? buildOldTown(m) : null), [m, SEA]);
  if (!SEA) return null;

  return (
    <group>
      <mesh geometry={skirt} raycast={noRaycast}>
        <meshLambertMaterial color={SEA.colors.hill} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[(SEA.coastX - SEA.far) / 2, SEA.level, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <planeGeometry args={[SEA.far + SEA.coastX, SEA.span * 2]} />
        <meshLambertMaterial color={SEA.colors.water} />
      </mesh>
      <mesh geometry={town} raycast={noRaycast}>
        <meshLambertMaterial color={SEA.colors.town} />
      </mesh>
    </group>
  );
}
