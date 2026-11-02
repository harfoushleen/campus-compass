// The land beyond the scene's edge as a single geometry (used by components/campus/Horizon.jsx, and tested by npm run check:byblos).
import * as THREE from 'three';

const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * The ground beyond the scene's edge, as ONE grid so there are no seams. Its height is the height of the
 * nearest point on the scene's edge, falling away with distance. The cells under the scene's own terrain are left out.
 * Along the seam it is sampled as finely as the terrain and meets it at the same height, and a wall hangs below the seam,
 * so no hairline of sky colour shows between the two.
 */
export function buildSkirt(m) {
  const { BOUNDS: B, HORIZON, heightAt } = m;
  const far = HORIZON.span;
  const axis = (min, max, step) => {
    const out = [];
    for (let k = 24; k >= 1; k--) out.push(min - 20 * k ** 1.9 - 1); // finer near the scene, out to the far edge
    for (let v = min; v <= max + 0.1; v += step) out.push(v);
    for (let k = 1; k <= 24; k++) out.push(max + 20 * k ** 1.9 + 1);
    return out.map((v) => Math.max(-far, Math.min(far, v)));
  };
  const xs = axis(B.minX, B.maxX, 3), zs = axis(B.minZ, B.maxZ, 3);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const heightOutside = (x, z) => {
    const cx = clamp(x, B.minX, B.maxX), cz = clamp(z, B.minZ, B.maxZ);
    const away = Math.hypot(x - cx, z - cz);
    return heightAt(cx, cz) - 0.5 * smooth(away / 25) - HORIZON.fall * smooth(away / HORIZON.fallDistance);
  };
  const insideScene = (x, z) => x >= B.minX - 0.01 && x <= B.maxX + 0.01 && z >= B.minZ - 0.01 && z <= B.maxZ + 0.01;
  const positions = [];
  for (const z of zs) for (const x of xs) positions.push(x, heightOutside(x, z), z);
  const index = [];
  const cols = xs.length;
  for (let r = 0; r < zs.length - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (insideScene((xs[c] + xs[c + 1]) / 2, (zs[r] + zs[r + 1]) / 2)) continue;
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      index.push(a, d, b, b, d, e);
    }
  }
  // The wall: down from each point of the seam.
  const wallDrop = 30;
  const ring = [];
  for (const x of xs) if (x >= B.minX - 0.01 && x <= B.maxX + 0.01) ring.push([x, B.minZ], [x, B.maxZ]);
  for (const z of zs) if (z >= B.minZ - 0.01 && z <= B.maxZ + 0.01) ring.push([B.minX, z], [B.maxX, z]);
  const wall = new Map();
  for (const [x, z] of ring) wall.set(x + ',' + z, [x, z]);
  const edges = (pts) => pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const sides = [
    edges([...wall.values()].filter(([, z]) => z === B.minZ)),
    edges([...wall.values()].filter(([, z]) => z === B.maxZ)),
    edges([...wall.values()].filter(([x]) => x === B.minX)),
    edges([...wall.values()].filter(([x]) => x === B.maxX)),
  ];
  for (const side of sides) {
    for (let i = 0; i < side.length - 1; i++) {
      const [x0, z0] = side[i], [x1, z1] = side[i + 1];
      const y0 = heightAt(x0, z0), y1 = heightAt(x1, z1), k = positions.length / 3;
      positions.push(x0, y0, z0, x1, y1, z1, x0, y0 - wallDrop, z0, x1, y1 - wallDrop, z1);
      index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
