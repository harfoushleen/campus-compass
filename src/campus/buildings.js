// ─────────────────────────────────────────────────────────────────────────────
// LAU Beirut buildings for the 3D campus. One entry per building.
//
// Coordinates are metres from the campus origin (see geo.js):
//   x = metres east, z = metres south. Footprints are lists of [x, z] corners.
// Outlines come from OpenStreetMap (© OpenStreetMap contributors), rounded,
// and adjusted where the official campus map clearly disagrees (noted below).
//
// Each building:
//   id        Official code. Must match the place "id" in src/data/places.json.
//   name      Full name (details, hover).
//   label     Optional shorter name for the floating 3D label.
//   labelOffset  Optional [x, z] metres to move the label, e.g. if it overlaps another one.
//   labelPriority  1 = main (always shown), 2 = shown when zoomed in a bit, 3 = zoomed in more.
//                  Default 2. See LABELS in site.js.
//   style     Key into STYLES below (colours / materials).
//   parts     One or more blocks. Each part has:
//               footprint   corners [[x, z], ...] (any order around the edge)
//               floors      number of floors above the ground
//               floorHeight optional, metres per floor (default FLOOR_HEIGHT)
//               roof        'flat' | 'hip' | 'sawtooth' | 'courts' (detail added in stage 3)
//               style       optional, overrides the building's style for this part
//   extras    optional small details (glass bays, towers, roof boxes), see EXTRAS below
//   underground  true = drawn only as an entrance (Underground Parking)
// ─────────────────────────────────────────────────────────────────────────────

export const FLOOR_HEIGHT = 3.5;

// Facade types. Change a value here and every building using it updates.
//   wall     wall colour
//   roof     colour of flat roofs
//   windows  'grid' (a window per bay and floor), 'ribbon' (a glass strip per floor) or 'none'
//   window   window glass colour (optional, default WINDOWS.color)
//   accent   colour of the floor bands, drawn when bands: true
export const STYLES = {
  white:       { wall: '#eceeed', roof: '#d4d8d7', windows: 'grid' },
  whiteOrange: { wall: '#efe9df', roof: '#d4d8d7', windows: 'grid', accent: '#e0a35a', bands: true },
  stone:       { wall: '#8e5e4e', roof: '#d9d9d4', windows: 'grid', window: '#3b2f2b' },
  brick:       { wall: '#8a5a45', roof: '#e6e6e2', windows: 'grid', window: '#3b2f2b' },
  stoneLight:  { wall: '#9b7058', roof: '#d9d9d4', windows: 'grid', window: '#3b2f2b' },
  safadi:      { wall: '#f1f1ef', roof: '#f7f7f5', windows: 'grid', accent: '#d9a15a', bands: true },
  gym:         { wall: '#9a9e9b', roof: '#4c7d3c', windows: 'none' },
  parking:     { wall: '#2b2b2b', roof: '#2b2b2b', windows: 'none' },
  // Gezairi: placeholder look (light beige with window strips) until photos are available.
  // Restyle it here, e.g. windows: 'grid' or different colours.
  gezairi:     { wall: '#d8cdb8', roof: '#c9bfab', windows: 'ribbon', window: '#5f7480' },
};

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
};

// EXTRAS: small shapes added to a building. Each one has:
//   shape   'box' or 'cylinder'
//   at      [x, z] centre
//   size    box: [length, depth]; cylinder: radius
//   angle   box rotation in degrees (from east toward south), optional
//   base    'ground' (stands on the ground) or 'top' (sits on the roof of the tallest part)
//   height  metres, or 'full' = from the ground up to the roof plus `above` metres
//   color   hex code or a name from EXTRA_COLORS

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

// Sage Hall's OSM outline (27 × 12 m) is much smaller than the building on the
// official map, where it's about as wide as Irwin Hall. So it's rebuilt here as a
// centre block plus two wings, centred on the OSM position and following its angle.
const SAGE = { cx: -39.2, cz: 34.0, angle: 12.7 };
const sageOffset = (along) => [
  SAGE.cx + Math.cos((SAGE.angle * Math.PI) / 180) * along,
  SAGE.cz + Math.sin((SAGE.angle * Math.PI) / 180) * along,
];

export const BUILDINGS = [
  {
    id: 'WKSC',
    labelPriority: 1,
    name: 'Wadad Sabbagh Khoury Student Center',
    label: 'Student Center',
    style: 'white',
    parts: [
      {
        footprint: [[14.2, 69.6], [14.5, 74], [37, 87], [53, 86.5], [57.5, 84.5], [58, 70], [46.7, 70], [45.1, 70], [45.1, 67], [24.2, 67], [24.2, 69.6]], // 1.5 m slot between the Student Center and Nicol Hall: it runs round the front block and all the way west, out toward the Upper Gate. Numbers: 45.1 / 24.2 / 67 / 69.6 (OSM has the two touching)
        floors: 6,
        roof: 'flat',
      },
    ],
    // Cream curved roof shell over the back corner, as on the official map.
    extras: [{ shape: 'box', at: [44, 79], size: [24, 12], angle: 20, base: 'top', height: 2.5, color: 'cream' }],
  },
  {
    id: 'NH',
    name: 'Nicol Hall',
    style: 'white',
    parts: [
      {
        footprint: [
          [12.8, 37.1], [13.3, 69.1], [22.8, 67.9], [22.7, 65.9], [46.6, 65.5], [46.7, 70], [58, 69.8],
          [57.9, 28.4], [45.9, 28.6], [46.2, 42.7], [43.6, 42.7], [43.6, 36.5], [26.9, 36.8], [27, 43.6],
          [24.4, 43.6], [24.4, 36.9],
        ],
        floors: 6,
        roof: 'flat',
      },
    ],
  },
  {
    id: 'SFA',
    name: 'Safadi Fine Arts',
    style: 'safadi',
    parts: [{ footprint: [[38.6, -2.7], [36.6, 25.1], [59.1, 26.7], [61.1, -1.2]], floors: 4, roof: 'sawtooth' }],
  },
  {
    id: 'GYM',
    name: 'Joseph G. Jabbra Gymnasium',
    label: 'Gymnasium',
    labelOffset: [12, 14], // keeps it clear of the University Services label
    style: 'gym',
    // Mostly underground: only a low deck shows, with the tennis courts on top.
    parts: [{ footprint: [[26.3, -3.6], [28.5, -36.6], [50.1, -34.6], [60.5, -34], [59.1, -1.4], [38.6, -2.7]], floors: 1, floorHeight: 4, roof: 'courts' }],
  },
  {
    id: 'US',
    name: 'University Services',
    style: 'whiteOrange',
    parts: [
      {
        footprint: [[23.7, -50.7], [55.9, -48.8], [58.8, -47.6], [58.5, -39.6], [57.6, -37.2], [25.7, -39.9], [23.3, -42.7]],
        floors: 5,
        roof: 'flat',
      },
    ],
  },
  {
    id: 'IH',
    labelPriority: 1,
    name: 'Irwin Hall',
    style: 'brick',
    parts: [
      // Front block (facing the street): flat roof, arcade and glass bay.
      { footprint: [[-8, -37.2], [-9.6, -23.6], [25.8, -19.6], [27.4, -33.2]], floors: 4, roof: 'flat' },
      // Rear block: red hip roof.
      { footprint: [[-1.9, -23], [-4.4, -0.4], [15.5, 1.9], [18, -20.5]], floors: 5, roof: 'hip', style: 'stone' },
    ],
    // Glass bay across the middle of the front facade.
    extras: [{ shape: 'box', at: [9.8, -36.4], size: [18, 2], angle: 6.5, base: 'ground', height: 7, color: 'glass' }],
  },
  {
    id: 'SH',
    labelPriority: 1,
    name: 'Sage Hall',
    style: 'stone',
    parts: [
      { footprint: orientedRect(...sageOffset(0), 20, 15, SAGE.angle), floors: 4, roof: 'hip' },
      { footprint: orientedRect(...sageOffset(-16), 12, 12, SAGE.angle), floors: 3, roof: 'hip' },
      { footprint: orientedRect(...sageOffset(16), 12, 12, SAGE.angle), floors: 3, roof: 'hip' },
    ],
  },
  {
    id: 'ShH',
    name: 'Shannon Hall',
    style: 'stoneLight',
    parts: [
      {
        footprint: [
          [-47, -31.3], [-38.9, -29.5], [-45.2, -3.1], [-54.3, -5.2], [-53.4, -9.1], [-61.2, -10.9],
          [-59.1, -19.8], [-56.4, -19.2], [-55.4, -23.5], [-52.6, -22.9], [-51.7, -26.9], [-48.3, -26.1],
        ],
        floors: 4,
        roof: 'flat',
      },
    ],
    // Small rooftop box (stairs / plant room).
    extras: [{ shape: 'box', at: [-50, -17], size: [6, 5], angle: 77, base: 'top', height: 3, color: 'plant' }],
  },
  {
    id: 'OG',
    labelPriority: 1,
    name: 'Orme-Gray',
    style: 'whiteOrange',
    parts: [
      { footprint: [[-105.3, 6.8], [-104.4, -4.8], [-74.9, -2.6], [-75.8, 9.5]], floors: 6, roof: 'hip' },  // north block
      { footprint: [[-101.7, 28.5], [-100.1, 7.1], [-89.3, 8.5], [-90.9, 29.2]], floors: 6, roof: 'flat' }, // connecting wing
      { footprint: [[-77.4, 30.2], [-78.3, 42.2], [-107.7, 40], [-106.9, 28.1]], floors: 5, roof: 'hip' },  // Middle Gate block
    ],
  },
  {
    id: 'AKSOB',
    labelPriority: 1,
    name: 'Adnan Kassar School of Business',
    label: 'School of Business',
    style: 'white',
    parts: [{ footprint: [[-167.5, 19.6], [-167.6, 36.9], [-125.8, 37.1], [-125.7, 19.8]], floors: 11, roof: 'flat' }],
    extras: [
      { shape: 'box', at: [-126.5, 20.8], size: [3, 3], base: 'ground', height: 'full', above: 0.5, color: 'glass' }, // glass corner
      { shape: 'box', at: [-150, 28], size: [16, 10], base: 'top', height: 3.5, color: 'plant' },                   // rooftop setback
    ],
  },
  {
    id: 'RNL',
    labelPriority: 1,
    name: 'Riyad Nassar Library',
    label: 'Library',
    style: 'white',
    parts: [
      { footprint: [[-167.4, -2.6], [-167.5, 19.6], [-151.5, 19.6], [-151.4, -2.6]], floors: 8, roof: 'flat' },
      { footprint: [[-151.4, -2.6], [-151.5, 14.1], [-139.4, 14.1], [-133.9, 11.2], [-131.3, 6.7], [-130.7, -2.5]], floors: 8, roof: 'flat' },
    ],
    // Glass cylinder at the rounded corner.
    extras: [{ shape: 'cylinder', at: [-135.5, 8.5], size: 5.5, base: 'ground', height: 'full', above: 2, color: 'glass' }],
  },
  {
    id: 'UGP',
    labelPriority: 3,
    name: 'Underground Parking',
    label: 'Parking (U)',
    style: 'parking',
    underground: true,
    // Only the street entrance is drawn. The parking layer also outlines the area below.
    parts: [{ footprint: orientedRect(-160, -5, 8, 4), floors: 1, floorHeight: 4, roof: 'flat' }],
  },
  {
    id: 'GB',
    name: 'Gezairi Building',
    style: 'gezairi',
    // Not on the official map. OSM outline of the first building on Sadat Street,
    // reached from the Lower Gate. Confirm the exact building on site.
    parts: [
      {
        footprint: [[-105.9, -132.1], [-94.7, -131.5], [-94.5, -135.8], [-90, -135.6], [-89.1, -153.4], [-96.7, -153.8], [-97.3, -142.2], [-105.4, -142.6]],
        floors: 13,
        floorHeight: 3.2,
        roof: 'flat',
      },
    ],
    extras: [{ shape: 'box', at: [-96, -142], size: [8, 6], base: 'top', height: 3, color: 'plant' }],
  },
];
