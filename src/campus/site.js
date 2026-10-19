// ─────────────────────────────────────────────────────────────────────────────
// Everything in the 3D campus that isn't a building: ground, gates, parking,
// camera and colours. Coordinates: metres, x = east, z = south (see geo.js).
// ─────────────────────────────────────────────────────────────────────────────

// Area of the 3D scene (also limits how far the camera can pan).
export const BOUNDS = { minX: -260, maxX: 140, minZ: -190, maxZ: 150 };

// ── Ground / hill ──
// The campus climbs from the front street (north) up to Sage Hall and the
// Upper Gate (south). Modelled as a smooth slope from `lowY` to `highY`
// between z = `fromZ` and z = `toZ`.
export const TERRAIN = { fromZ: -20, toZ: 30, lowY: 0, highY: 8 };

/** Ground height (m) at a point. */
export function heightAt(x, z) {
  const t = Math.min(1, Math.max(0, (z - TERRAIN.fromZ) / (TERRAIN.toZ - TERRAIN.fromZ)));
  const smooth = t * t * (3 - 2 * t);
  return TERRAIN.lowY + (TERRAIN.highY - TERRAIN.lowY) * smooth;
}

// Campus boundary (from OpenStreetMap), drawn as lighter ground.
export const CAMPUS_OUTLINE = [
  [-38.3, -46.7], [-29.8, -54.2], [23.7, -49.5], [28.3, -51.3], [55.9, -48.8], [60.7, -47.5], [60.1, -38.6],
  [60.3, -19.2], [61.4, -5.5], [63.9, 1.8], [62.4, 42.2], [61.2, 72.8], [58.6, 91.9], [56.8, 100.3], [-3.8, 67.1],
  [-29.8, 54.1], [-48.9, 48.8], [-83.2, 45.8], [-126.1, 43.2], [-169.9, 38.8], [-174.2, 34.6], [-174.7, -3.4],
  [-170.9, -7.8], [-126.8, -12], [-122, -7.2], [-75.3, -6.5], [-67.3, -10.3], [-50, -32.7],
];

// ── Surrounding city ──
// Neighbouring buildings come from osm-surroundings.json (npm run osm).
// The official map draws them as low plain blocks, so they get one height by default.
export const SURROUNDINGS = {
  height: 6,             // metres, used for every neighbouring building…
  useRealLevels: false,  // …unless true: then OSM "building:levels" is used where known
  floorHeight: 3.2,
  maxDistance: 35,       // only buildings within this many metres of the campus are drawn…
  alsoNear: ['GB'],      // …or of these LAU buildings outside the campus
};

// ── Landscaping ──
// Trees: random positions inside each cluster (the same every load), or evenly
// along a row. Trees that would land inside a building are skipped.
export const TREES = {
  clusters: [
    { center: [-15, 14], radius: 14, count: 16 }, // between Irwin and Sage
    { center: [-2, 30], radius: 10, count: 9 },   // on the terraces
    { center: [-36, -34], radius: 8, count: 7 },  // Shannon / Lower Gate
    { center: [-66, 16], radius: 9, count: 6 },   // between Shannon and Orme-Gray
    { center: [8, 56], radius: 6, count: 4 },     // by the amphitheater
    { center: [30, 30], radius: 8, count: 5 },    // in front of Nicol
  ],
  rows: [
    { from: [-6, -41], to: [24, -38], count: 8 },   // hedge of trees in front of Irwin
    { from: [-168, -6], to: [-132, -6], count: 7 }, // along the Library front
  ],
  colors: ['#2f5a3a', '#3d6e44'], // two greens, mixed at random
  trunk: '#6b4f3a',
};

// Stepped green terraces climbing from the plaza toward the amphitheater.
export const TERRACES = { x: [-16, 11], z: [6, 40], steps: 4, grass: '#6f8f4a', wall: '#a08268' };

// Amphitheater below the Upper Gate, open to the north.
export const AMPHITHEATER = { center: [-4, 50], radius: 10, tiers: 5, color: '#b9a58a' };

// ── Labels ──
// Building labels are shown by default; users can hide them with the "Labels" button.
export const LABELS = { showByDefault: true };

// ── Gezairi marker ──
// When the Gezairi Building is off-screen, a small "Gezairi →" marker sits at the
// edge of the view, pointing to it. Tapping it flies the camera there.
export const OFFSCREEN_MARKERS = [
  {
    buildingId: 'GB',
    labelKey: 'marker.gezairi', // marker text, in src/i18n/en.js
    // Camera distance (m) when flying to the building.
    viewDistance: 300,
  },
];
export const FLY_DURATION = 1.2; // seconds

// ── Gates ──
// `position`: where the gatehouse stands. `labelHeight`: how high its label floats
// (the Middle Gate's label sits above Orme-Gray, like on the official map).
export const GATES = [
  { id: 'upper', name: 'Upper Gate', position: [-8, 68], labelHeight: 9 },
  { id: 'middle', name: 'Middle Gate', position: [-108, 44], labelHeight: 28 },
  { id: 'lower', name: 'Lower Gate', position: [-50, -51], labelHeight: 9 },
];

// ── Parking layer ── (shown with the "Parking" toggle)
// `area`: outline of the lot. `badge`: where the P + letter marker floats.
// `placeId`: the matching entry in places.json (opens its details on tap).
export const PARKING = [
  {
    code: 'M',
    name: 'Middle Gate Parking',
    access: 'Students/Faculty/Staff',
    placeId: 'P-M',
    area: [[-122, 56], [-76, 59], [-76, 80], [-122, 78]], // guess: behind Orme-Gray, past the Middle Gate
    badge: [-99, 68],
  },
  {
    code: 'U',
    name: 'Underground Parking',
    access: 'Faculty/Staff',
    placeId: 'UGP',
    area: [[-168, -3], [-168, 37], [-126, 37], [-126, -3]], // guess: under the Library and AKSOB
    underground: true,
    badge: [-160, -9],
  },
  {
    code: 'L',
    name: 'Lower Gate Parking',
    access: 'LAU Vehicles/Authorized',
    placeId: 'P-L',
    area: [[-85.9, -54.3], [-86.6, -49.6], [-80.3, -45.3], [-81.1, -39.2], [-59.5, -35.1], [-57.3, -50.7]], // OSM
    badge: [-72, -45],
  },
  {
    code: 'G',
    name: 'Gezairi Parking',
    access: 'Faculty/Staff',
    placeId: 'P-G',
    area: [[-105.9, -132.1], [-90, -135.6], [-89.1, -153.4], [-105.4, -142.6]], // guess: at the Gezairi Building
    underground: true,
    badge: [-84, -142],
  },
];

// ── Camera ──
// The default view matches the angle of the official campus map. It was worked out
// by matching building positions in that image. `fov` is the vertical field of view
// for a landscape screen as wide as the image (aspect 1.5); narrower screens move
// the camera back so the whole campus still fits.
export const CAMERA = {
  target: [-19, 10, 3],
  position: [128, 135, -209],
  fov: 28,
  referenceAspect: 2025 / 1353,
  narrowScreenFit: 0.55, // 1 = always fit the full width on phones, lower = closer (sides cropped)
  // Orbit limits
  minDistance: 40,
  maxDistance: 1100,
  minPolarAngle: 0.15,              // radians from straight down (0 = top view)
  maxPolarAngle: (78 * Math.PI) / 180, // stops the camera before it reaches the ground
};

// ── Colours ──
export const COLORS = {
  background: '#3d4a45', // outside the campus, like the map's dark backdrop
  campusGround: '#d9cfb5',
  street: '#c9c2ae',
  surrounding: '#d6d6d1',
  highlight: '#ffcf70',
  selected: '#ffb84d',
  dimmed: '#9fa3a1',
};
