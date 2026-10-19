// Keeps a DOM marker (e.g. "Gezairi →") pinned to the edge of the view, pointing at a
// point in the scene that is currently off-screen. Hidden while the point is visible.
// Runs inside the <Canvas>; the marker element itself lives outside it (see CampusView).
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const MARGIN = 56; // px kept free at the edges of the view

export default function OffscreenMarker({ point, elementRef, arrowRef }) {
  const v = useRef(new THREE.Vector3());

  // Runs whenever the scene redraws (i.e. whenever the camera moves).
  useFrame(({ camera, size }) => {
    const el = elementRef.current;
    if (!el) return;
    const p = v.current.set(...point).project(camera); // -1..1 screen coordinates
    const behind = p.z > 1;
    let x = behind ? -p.x : p.x;
    let y = behind ? -p.y : p.y;

    const visible = !behind && Math.abs(x) < 1 && Math.abs(y) < 1;
    el.style.display = visible ? 'none' : 'flex';
    if (visible) return;

    // Push the point onto the edge of the screen (inside the margin).
    const mx = 1 - (2 * MARGIN) / size.width, my = 1 - (2 * MARGIN) / size.height;
    const k = Math.max(Math.abs(x) / mx, Math.abs(y) / my, 1e-6);
    x /= k; y /= k;
    const px = ((x + 1) / 2) * size.width, py = ((1 - y) / 2) * size.height;
    el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
    if (arrowRef.current) arrowRef.current.style.transform = `rotate(${Math.atan2(-y, x)}rad)`;
  });

  return null;
}
