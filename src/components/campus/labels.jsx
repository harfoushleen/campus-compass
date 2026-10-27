// Label management for the 3D view.
//
// Every floating label (buildings, gates, hangout spots, parking badges) is a
// <ManagedLabel>. On each redraw, <LabelLayout> decides what to show:
//   1. Zoom: labels with priority 2 or 3 appear only when zoomed in far enough
//      (thresholds in LABELS, campus/common.js). Hovered/selected labels always show.
//   2. Overlap: going from most to least important, a label that would overlap
//      an already-placed label, or a button / the Gezairi marker, is hidden.
//   "Compactable" labels (hangout pins) shrink to their icon instead of
//   disappearing when their name doesn't fit.
import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { LABELS } from '../../campus/common.js';

export const LabelContext = createContext(null);

/** Shared list of labels, created once per 3D view. */
export function createLabelRegistry() {
  return { items: new Set() };
}

/**
 * A label floating at a 3D position.
 *   priority     1 main, 2 secondary, 3 minor
 *   pinned       always shown (hovered or selected items, parking badges)
 *   compactable  shrinks to an icon instead of hiding (needs a .label-text child to hide)
 */
export function ManagedLabel({ position, priority = 1, pinned = false, compactable = false, zIndexRange = [20, 10], children }) {
  const { registry, portal } = useContext(LabelContext);
  const invalidate = useThree((s) => s.invalidate);
  const item = useRef(null);
  const [x, y, z] = position;
  // Latest settings, read when the element appears and on every update.
  const settings = useRef();
  settings.current = { x, y, z, priority, pinned, compactable };

  const apply = (it) => {
    const s = settings.current;
    it.anchor.set(s.x, s.y, s.z);
    if (it.pinned !== s.pinned) it.size = null; // text may change (short vs full name): measure again
    Object.assign(it, { priority: s.priority, pinned: s.pinned, compactable: s.compactable });
  };

  // drei renders the label's contents a moment after mount, so the label registers
  // itself through a callback ref, when its element actually exists.
  const setElement = useCallback(
    (el) => {
      if (item.current) registry.items.delete(item.current);
      item.current = el ? { el, anchor: new THREE.Vector3(), size: null } : null;
      if (item.current) {
        apply(item.current);
        registry.items.add(item.current);
      }
      invalidate();
    },
    [registry, invalidate]
  );

  // Keep the registered settings up to date after each render.
  useEffect(() => {
    if (!item.current) return;
    apply(item.current);
    invalidate();
  });

  // Unregister when removed.
  useEffect(() => () => item.current && registry.items.delete(item.current), [registry]);

  return (
    <Html portal={portal} position={position} center zIndexRange={zIndexRange} style={{ pointerEvents: 'none' }}>
      <div ref={setElement} className="managed-label">
        {children}
      </div>
    </Html>
  );
}

const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const v = new THREE.Vector3();

/**
 * Runs the layout on every redraw. `obstacles` returns DOM elements labels must not cover
 * (toolbar, off-screen markers); `container` is the element the labels are positioned in.
 */
export function LabelLayout({ obstacles, container }) {
  const { registry } = useContext(LabelContext);
  const invalidate = useThree((s) => s.invalidate);

  useFrame(({ camera, size, controls }) => {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;

    // How zoomed in the view is: screen width per metre of camera distance.
    const distance = controls ? camera.position.distanceTo(controls.target) : 300;
    const zoom = size.width / distance;
    const maxPriority = zoom >= LABELS.zoomForPriority3 ? 3 : zoom >= LABELS.zoomForPriority2 ? 2 : 1;

    // Rectangles already taken: buttons and markers that are showing.
    const placed = obstacles()
      .filter((el) => el && el.offsetParent !== null && getComputedStyle(el).display !== 'none')
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left - box.left - 4, right: r.right - box.left + 4, top: r.top - box.top - 4, bottom: r.bottom - box.top + 4 };
      });

    const obstacleRects = [...placed];
    const decisions = new Map();
    let retry = false;
    const screen = new Map(); // item -> { cx, cy } or null if behind the camera

    // Measure and project every label first.
    for (const item of registry.items) {
      // Measure each label once at full size (text doesn't change).
      if (!item.size) {
        item.el.classList.remove('label-compact', 'label-hidden');
        const w = item.el.offsetWidth, h = item.el.offsetHeight;
        if (!w) {
          // Not rendered yet: hide for now and ask for another frame (a limited number of times,
          // so a label that stays off-screen doesn't keep the 3D view redrawing).
          item.tries = (item.tries ?? 0) + 1;
          if (item.tries < 60) retry = true;
          decisions.set(item, 'hidden');
          continue;
        }
        item.size = { w, h };
        const icon = item.el.querySelector('.label-icon');
        item.iconSize = icon ? { w: icon.offsetWidth + 6, h: icon.offsetHeight + 6 } : item.size;
      }
      v.copy(item.anchor).project(camera);
      if (v.z > 1) { decisions.set(item, 'hidden'); continue; } // behind the camera
      screen.set(item, { cx: ((v.x + 1) / 2) * size.width, cy: ((1 - v.y) / 2) * size.height });
    }

    const rectOf = (item, { w, h }, shift = 0) => {
      const { cx, cy } = screen.get(item);
      return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2 + shift, bottom: cy + h / 2 + shift };
    };
    const onScreen = (r) => r.left >= 0 && r.right <= size.width && r.top >= 0 && r.bottom <= size.height;
    const free = (r, against = placed) => !against.some((p) => overlaps(r, p));
    const todo = [...screen.keys()];
    const wantsText = (item) => item.pinned || item.priority <= maxPriority;
    const shifts = new Map(); // item -> vertical shift in px

    /** Places a text label at its spot, or nudged just above/below it. */
    const placeText = (item, against) => {
      const h = item.size.h + 4;
      for (const shift of [0, -h, h]) {
        const r = rectOf(item, item.size, shift);
        if (onScreen(r) && free(r, against)) {
          placed.push(r);
          shifts.set(item, shift);
          decisions.set(item, 'full');
          return true;
        }
      }
      return false;
    };

    // 1. Pinned labels (hovered/selected, parking badges): always shown.
    for (const item of todo.filter((i) => i.pinned)) {
      placed.push(rectOf(item, item.size));
      decisions.set(item, 'full');
    }
    // 2. Hangout icons: always shown (they're tappable), unless they'd cover a button.
    for (const item of todo.filter((i) => !i.pinned && i.compactable)) {
      const r = rectOf(item, item.iconSize);
      item.placedIcon = null;
      if (free(r, obstacleRects)) { placed.push(r); item.placedIcon = r; decisions.set(item, 'compact'); }
    }
    // 3. Text labels by priority (main first), where the zoom allows and they fit.
    //    On equal priority, building/gate labels go before hangout names.
    const rest = todo
      .filter((i) => !i.pinned)
      .sort((a, b) => a.priority - b.priority || a.compactable - b.compactable);
    for (const item of rest) {
      if (!wantsText(item)) continue;
      // A hangout's own icon is inside its full label, so it doesn't count as an obstacle.
      const against = item.compactable ? placed.filter((p) => p !== item.placedIcon) : placed;
      placeText(item, against);
    }
    for (const item of todo) if (!decisions.has(item)) decisions.set(item, 'hidden');

    // Write all changes after all measurements (avoids layout thrashing).
    for (const [item, state] of decisions) {
      item.el.classList.toggle('label-hidden', state === 'hidden');
      item.el.classList.toggle('label-compact', state === 'compact');
      const shift = shifts.get(item) ?? 0;
      item.el.style.transform = shift ? `translateY(${shift}px)` : '';
    }
    if (retry) invalidate();
  });

  return null;
}
