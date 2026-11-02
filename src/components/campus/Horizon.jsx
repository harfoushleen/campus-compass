// The land beyond the scene's edge (only campuses with a HORIZON setting, i.e. Byblos).
//   - the hillside: one continuous ground surface around the scene that carries on at the edge's height
//     and falls away a little with distance (forest running down the mountain);
//   - haze: distant ground fades into the sky colour, so the world has no visible edge.
// One merged mesh. Settings: HORIZON in the campus's site.js.
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useModel } from './model.js';
import { buildSkirt } from '../../campus/horizon.js';

const noRaycast = () => null;

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
