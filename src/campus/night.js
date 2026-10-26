// How "night" the scene is right now, from 0 (daylight) to 1 (evening, lights on).
// SceneTheme eases this value when the theme changes. Anything that glows (lit windows,
// lamps) subscribes here and adjusts its own materials, so the lights fade in and out
// together with the sky.
let level = 0;
const listeners = new Set();

/** Calls `apply(level)` now and whenever the level changes. Returns a function that stops listening. */
export function onNightLevel(apply) {
  listeners.add(apply);
  apply(level);
  return () => listeners.delete(apply);
}

export function setNightLevel(value) {
  if (value === level) return;
  level = value;
  listeners.forEach((apply) => apply(level));
}
