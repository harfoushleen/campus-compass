// ─────────────────────────────────────────────────────────────────────────────
// Settings shared by every campus's 3D model (Beirut, Byblos...): floor height, window
// size, roof colours, label zoom levels, the light/dark scene and the night lights.
// Settings that belong to one campus are in its own folder (src/campus/<campus>/).
// ─────────────────────────────────────────────────────────────────────────────

export const FLOOR_HEIGHT = 3.5;

// Windows. All buildings share one instanced mesh, so thousands of them stay cheap.
export const WINDOWS = {
  color: '#4d6470',
  spacing: 3.2, // metres between window centres along a wall
  width: 1.3,
  height: 1.8,
  minWall: 3,   // walls shorter than this get no windows
};

// Colours of the shaped roofs.
export const ROOFS = {
  hip: '#c4502e',      // red tiles
  sawtooth: '#f7f7f5', // Safadi skylights
};

// Named colours that extras can use instead of a hex code.
export const EXTRA_COLORS = {
  glass: '#9db8bf',
  cream: '#e6c787',
  plant: '#c9cccb',
  door: '#4a3426',
  doorFrame: '#e4e2dc',
};

/**
 * Builds a rectangle footprint from a centre point, size and rotation.
 * Handy for hand-made parts. `angle` is in degrees, measured from east toward south.
 */
export function orientedRect(cx, cz, length, depth, angle = 0) {
  const a = (angle * Math.PI) / 180;
  const ux = Math.cos(a), uz = Math.sin(a); // along the length
  const vx = -uz, vz = ux;                   // along the depth
  const l = length / 2, d = depth / 2;
  return [
    [cx - ux * l - vx * d, cz - uz * l - vz * d],
    [cx + ux * l - vx * d, cz + uz * l - vz * d],
    [cx + ux * l + vx * d, cz + uz * l + vz * d],
    [cx - ux * l + vx * d, cz - uz * l + vz * d],
  ];
}

// ── Labels ──
// Every label has a priority: 1 = main, 2 = secondary, 3 = minor. On small or
// zoomed-out views only main labels show; the others appear as the user zooms in.
// "Zoom" is measured as screen width (px) divided by camera distance (m):
// a phone at the default view is about 0.8, a laptop at the default view about 3.5.
// Labels that would overlap a more important label or a button are hidden.
export const LABELS = {
  showByDefault: true, // the "Labels" button turns building and gate labels off/on
  zoomForPriority2: 1.0, // a phone shows these after zooming in a little (~1.3×)
  zoomForPriority3: 1.8, // …and these after zooming in more (~2.3×)
  gatePriority: 2,
  hangoutPriority: 4,  // 4 = never shown as text: pins are icons, and show their name only when tapped
};

export const HANGOUT_COLORS = {
  bench: '#8a6a4f',
  kiosk: '#f2e6d0',
  awning: '#d6336c',
  fountainStone: '#cfc6b4',
  water: '#2f8fe0',
  wood: '#7a5a40',
  vine: '#4f8a3a',
  shrub: '#4f7a3a',
  grass: '#74a64a',
  catHouse: '#c98f5a',
  catRoof: '#8b3a2b',
  rock: '#8a8d8a',
};

export const FLY_DURATION = 1.2; // seconds

// ── Scene light and dark ──
// The 3D scene follows the theme: the background (the "sky" and the ground beyond the campus)
// and the lighting fade between these values. Dark = a soft evening: dimmer light with a cool tint.
// (Labels and pins are normal page elements, so they stay readable in both.)
// `lights` is how bright the night lights are (lit windows, lamps): 0 = off, 1 = full.
export const SCENE = {
  light: { background: '#3d4a45', sky: '#ffffff', ground: '#8a8f7a', hemi: 1.6, sun: 1.6, sunColor: '#ffffff', lights: 0 },
  dark: { background: '#101615', sky: '#9db3dc', ground: '#2a323d', hemi: 0.62, sun: 0.55, sunColor: '#b5c3e6', lights: 1 },
};

// ── Night lights ── (only visible in the dark scene)
// Windows: a share of them glow warm. Which ones is random but the same on every load.
export const NIGHT_WINDOWS = {
  color: '#ffd596',
  litShare: 0.55,   // of the windows on the grid-style facades
  litShareRibbon: 0.75, // of the glass strips on ribbon-style facades (Gezairi)
};
// Lamp posts along the paths (and one by each gate), each with a halo and a pool of light on the ground.
export const LAMPS = {
  spacing: 16,       // metres between lamps along a path
  sideOffset: 0.8,   // metres from the path's edge; lamps alternate sides
  height: 4,         // metres
  poleColor: '#4a4f4d',
  offColor: '#d8d4c8', // the lamp head in daylight
  color: '#ffd596',  // the lamp head and its light at night
  haloSize: 5,       // metres across
  poolSize: 9,       // metres across
  poolOpacity: 0.5,
  gateOffset: [3.6, 0], // a lamp stands this far (x, z) from each gatehouse
};
