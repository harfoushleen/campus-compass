// Keeps a DOM marker (e.g. "Gezairi →") pinned to the edge of the view, pointing at a
// point in the scene that is currently off-screen. Hidden while the point is visible.
// Runs inside the <Canvas>; the marker element itself lives outside it (see CampusView).
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { visibleRange } from './viewport.js';

const MARGIN = 56; // px kept free at the edges of the view

// `avoidRef`: an element at the bottom of the view (the toolbar) the marker must stay above.
export default function OffscreenMarker({ point, elementRef, arrowRef, avoidRef }) {
  const v = useRef(new THREE.Vector3());

  // Runs whenever the scene redraws (i.e. whenever the camera moves).
  useFrame(({ camera, size, gl }) => {
    const el = elementRef.current;
    if (!el) return;
    const p = v.current.set(...point).project(camera); // -1..1 screen coordinates
    const behind = p.z > 1;
    // Where the point is on the canvas (px); the part of the canvas that is on screen may be narrower (sidebar open).
    const [lo, hi] = visibleRange(gl.domElement, size.width);
    const sx = ((behind ? -p.x : p.x) + 1) / 2 * size.width, sy = (1 - (behind ? -p.y : p.y)) / 2 * size.height;
    const visible = !behind && sx > lo && sx < hi && sy > 0 && sy < size.height;
    el.style.display = visible ? 'none' : 'flex';
    if (visible) return;

    // Push the point onto the edge of the visible part (inside the margin).
    const cx = (lo + hi) / 2, cy = size.height / 2;
    const dx = sx - cx, dy = sy - cy;
    const hw = (hi - lo) / 2 - MARGIN, hh = size.height / 2 - MARGIN;
    const k = Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh, 1e-6);
    const px = cx + dx / k;
    // Keep clear of the toolbar at the bottom.
    const bottomLimit = size.height - (avoidRef?.current?.offsetHeight ?? 0) - 40;
    const py = Math.min(cy + dy / k, bottomLimit);
    el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
    if (arrowRef.current) arrowRef.current.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });

  return null;
}
