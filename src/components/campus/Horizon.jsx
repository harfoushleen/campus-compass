// The land beyond the scene's edge (only campuses with a HORIZON setting, i.e. Byblos).
//   - the hillside: one continuous ground surface around the scene that carries on at the edge's height
//     and falls away a little with distance (forest running down the mountain);
//   - haze: distant ground fades into the sky colour, so the world has no visible edge.
// One merged mesh. Settings: HORIZON in the campus's site.js.
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useModel } from './model.js';

const noRaycast = () => null;

const smooth = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * The ground beyond the scene's edge, as ONE grid so there are no seams. Its height is the height of the
 * nearest point on the scene's edge, falling away with distance. The cells under the scene's own terrain are left out.
 */
function buildSkirt(m) {
  const { BOUNDS: B, HORIZON, heightAt } = m;
  const far = HORIZON.span;
  const axis = (min, max, step) => {
    const out = [];
    for (let k = 24; k >= 1; k--) out.push(min - 20 * k ** 1.9 - 1); // finer near the scene, out to the far edge
    for (let v = min; v <= max + 0.1; v += step) out.push(v);
    for (let k = 1; k <= 24; k++) out.push(max + 20 * k ** 1.9 + 1);
    return out.map((v) => Math.max(-far, Math.min(far, v)));
  };
  const xs = axis(B.minX, B.maxX, 10), zs = axis(B.minZ, B.maxZ, 10);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const heightOutside = (x, z) => {
    const cx = clamp(x, B.minX, B.maxX), cz = clamp(z, B.minZ, B.maxZ);
    return heightAt(cx, cz) - 0.5 - HORIZON.fall * smooth(Math.hypot(x - cx, z - cz) / HORIZON.fallDistance);
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
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Haze: distant ground fades into the sky colour (which changes with the light/dark scene). */
function Haze({ near, far }) {
  const { scene, invalidate } = useThree();
  useEffect(() => {
    scene.fog = new THREE.Fog('#ffffff', near, far);
    invalidate();
    return () => {
      scene.fog = null;
    };
  }, [scene, near, far, invalidate]);
  useFrame(() => {
    if (scene.fog && scene.background) scene.fog.color.copy(scene.background);
  });
  return null;
}

export default function Horizon() {
  const m = useModel();
  const { HORIZON } = m;
  const skirt = useMemo(() => (HORIZON ? buildSkirt(m) : null), [m, HORIZON]);
  if (!HORIZON) return null;

  return (
    <group>
      <Haze near={HORIZON.fog[0]} far={HORIZON.fog[1]} />
      <mesh geometry={skirt} raycast={noRaycast}>
        <meshLambertMaterial color={HORIZON.color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
