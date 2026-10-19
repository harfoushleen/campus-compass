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

// ── Hangout spots: 3D touches ──
// The spots themselves (name, position, features) are in places.json. This adds
// small 3D details around them, keyed by place id. They are always drawn, whatever
// the toolbar buttons say; the buttons only control the pins and labels.
//   benches     [[x, z, angleDegrees], ...]
//   kiosk       { at: [x, z], angle }              small café kiosk
//   fountain    { at: [x, z], radius }
//   featureTree { at: [x, z], size, color }        a large standout tree
//   shrubs      [[x, z], ...]                      low bushes
//   grass       { at: [x, z], size: [rx, rz] }     flat patch of grass
//   catHouse    { at: [x, z], angle }              small cat house
//   pergola     { at: [x, z], size: [length, depth], angle }   vine-covered pergola
// All positions are approximate (verified: false in places.json).
export const HANGOUT_DECOR = {
  'H-AKSOBCAF': {
    kiosk: { at: [-120, -3], angle: 0 },
    benches: [[-114, -4, 90], [-114, 1, 90], [-120, 2, 0]],
  },
  'H-FOUNTAIN': {
    // Inside the courtyard formed by the Orme-Gray buildings, standing on a lawn.
    fountain: { at: [-79, 19], radius: 3 },
    grass: { at: [-79, 19], size: [5.8, 5.8] },
    benches: [[-79, 13.6, 0], [-79, 24.4, 180]],
  },
  'H-VINE': {
    // Benches under a vine-covered pergola, where the fountain was first placed.
    pergola: { at: [-67.5, 18], size: [7, 3.2], angle: 0 },
    benches: [[-67.5, 16.9, 0], [-67.5, 19.1, 180]],
  },
  'H-GARDEN-TREE': {
    featureTree: { at: [-46, 15], size: 2.2, color: '#7fb04a' }, // the Tree of Life
  },
  'H-GARDEN-BENCHES': {
    benches: [[-28, 13, 0], [-22, 13, 0], [-25, 19, 180]],
  },
  CATS: {
    grass: { at: [-40, 47.5], size: [5, 2.3] },
    catHouse: { at: [-36.5, 47.5], angle: 0 },
    shrubs: [[-45, 50], [-34, 50.3]],
  },
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
};

// ── Paths and stairs ──
// Paths: lines of [x, z] points laid on the ground, `width` in metres.
// Stairs: from one point to another; the height gained follows the hill unless
// you give `rise` (metres). `steps` is the number of steps.
// Trees never grow on paths or stairs. Positions are approximate.
export const PATHS = [
  // Lower Gate up through the middle of the campus to the front of Sage Hall
  { id: 'lowerGate', width: 3, points: [[-50, -46], [-42, -38], [-33, -28], [-30, -14], [-31, 0], [-35, 10], [-38, 16]] },
  // Along the front of Irwin Hall
  { id: 'irwinFront', width: 3, points: [[-42, -38], [-26, -41], [-8, -41], [10, -40], [20, -39]] },
  // East–west garden path: Orme-Gray fountain, Tree of Life, garden benches, below the terraces, plaza
  { id: 'gardens', width: 3, points: [[-70, 18], [-60, 13], [-52, 8], [-44, 7], [-34, 9], [-24, 9], [-19, 5.5], [-12, 3.8], [4, 4.8], [22, 5], [32, 8]] },
  // Plaza: foot and top of the Nicol stairs
  // Fountain, on the lawn inside the Orme-Gray courtyard
  { id: 'fountain', width: 3, points: [[-70, 18], [-74, 19]] },
  { id: 'plazaLow', width: 3, points: [[22, 5], [22, 10]] },
  { id: 'plazaTop', width: 3, points: [[22, 30], [22, 32], [34, 34]] },
  // From the top of the terraces, around the amphitheater, to the Upper Gate
  { id: 'upperGate', width: 3, points: [[9, 41], [10, 50], [7, 60], [-2, 65], [-8, 66]] },
  // Fountain, behind Orme-Gray, to the Middle Gate
  { id: 'middleGate', width: 3, points: [[-70, 18], [-72, 32], [-76, 46], [-100, 46], [-108, 45]] },
  // AKSOB Gate, past the AKSOB Caf, up to the Middle Gate
  { id: 'aksobGate', width: 3, points: [[-116, -9], [-118, -3], [-117, 12], [-114, 28], [-112, 42], [-108, 45]] },
];

export const STAIRS = [
  { id: 'terraceWest', from: [-19, 7], to: [-19, 28], width: 3, steps: 16 },   // beside the terraces
  { id: 'nicol', from: [22, 10], to: [22, 30], width: 5, steps: 16 },          // plaza up to Nicol Hall
  { id: 'sageFront', from: [-38, 16], to: [-38, 24.5], width: 6, steps: 9 },   // Sage Hall entrance
];

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
  // Not on the official map. OSM tags an entrance here as "LAU Middle Gate (secondary)".
  // Name to be confirmed.
  { id: 'aksob', name: 'AKSOB Gate', position: [-116, -9], labelHeight: 9, verified: false },
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
  path: '#a6a9a7',   // concrete grey
  stairs: '#c2c5c3', // lighter concrete grey
};
