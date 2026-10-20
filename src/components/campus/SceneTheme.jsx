// Makes the 3D scene follow the light/dark theme: the background and the lighting fade
// smoothly from "daylight" to "evening" (values in SCENE in site.js). With "reduce motion"
// on, the change is instant. Runs inside the <Canvas>.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { SCENE } from '../../campus/site.js';

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function SceneTheme({ theme }) {
  const { scene, invalidate } = useThree();
  const hemi = useRef();
  const sun = useRef();
  const current = useRef(null); // the values being shown right now

  // Redraw when the theme changes (the canvas only draws when something changes).
  useEffect(() => invalidate(), [theme, invalidate]);

  useFrame((_, delta) => {
    const target = SCENE[theme] ?? SCENE.light;
    if (!current.current) {
      current.current = {
        background: new THREE.Color(target.background),
        sky: new THREE.Color(target.sky),
        ground: new THREE.Color(target.ground),
        sunColor: new THREE.Color(target.sunColor),
        hemi: target.hemi,
        sun: target.sun,
      };
    } else {
      const k = reduceMotion() ? 1 : 1 - Math.exp(-delta * 9); // ~300 ms to settle
      const c = current.current;
      c.background.lerp(new THREE.Color(target.background), k);
      c.sky.lerp(new THREE.Color(target.sky), k);
      c.ground.lerp(new THREE.Color(target.ground), k);
      c.sunColor.lerp(new THREE.Color(target.sunColor), k);
      c.hemi += (target.hemi - c.hemi) * k;
      c.sun += (target.sun - c.sun) * k;
    }
    const c = current.current;
    scene.background = c.background;
    if (hemi.current) {
      hemi.current.color.copy(c.sky);
      hemi.current.groundColor.copy(c.ground);
      hemi.current.intensity = c.hemi;
    }
    if (sun.current) {
      sun.current.color.copy(c.sunColor);
      sun.current.intensity = c.sun;
    }
    // Keep drawing until the values have settled.
    const settled = Math.abs(c.hemi - target.hemi) < 0.005 && Math.abs(c.sun - target.sun) < 0.005 && c.background.getHex() === new THREE.Color(target.background).getHex();
    if (!settled) invalidate();
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={sun} position={[120, 200, -80]} />
    </>
  );
}
