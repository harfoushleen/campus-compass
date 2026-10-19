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
//   name      Shown on hover.
//   style     Key into STYLES below (colours / materials).
//   parts     One or more blocks. Each part has:
//               footprint   corners [[x, z], ...] (any order around the edge)
//               floors      number of floors above the ground
//               floorHeight optional, metres per floor (default FLOOR_HEIGHT)
//               roof        'flat' | 'hip' | 'sawtooth' | 'courts' (detail added in stage 3)
//               style       optional, overrides the building's style for this part
//   underground  true = drawn only as an entrance (Underground Parking)
// ─────────────────────────────────────────────────────────────────────────────

export const FLOOR_HEIGHT = 3.5;

// Colours per facade type. Change a colour here and every building using it updates.
export const STYLES = {
  white:       { wall: '#eceeed', roof: '#d4d8d7' },
  whiteOrange: { wall: '#efe9df', roof: '#d4d8d7', accent: '#e0a35a' },
  stone:       { wall: '#8e5e4e', roof: '#c4502e' },
  brick:       { wall: '#8a5a45', roof: '#e6e6e2' },
  stoneLight:  { wall: '#9b7058', roof: '#d9d9d4' },
  safadi:      { wall: '#f1f1ef', roof: '#f7f7f5', accent: '#d9a15a' },
  gym:         { wall: '#9a9e9b', roof: '#4c7d3c' },
  parking:     { wall: '#2b2b2b', roof: '#2b2b2b' },
  // Gezairi: placeholder look until real photos are available. Restyle it here.
  gezairi:     { wall: '#d8cdb8', roof: '#c9bfab', accent: '#5f7480' },
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
    name: 'Wadad Sabbagh Khoury Student Center',
    style: 'white',
    parts: [
      {
        footprint: [[14, 68], [14.5, 74], [37, 87], [53, 86.5], [57.5, 84.5], [58, 70], [46.7, 70], [46.6, 65.5], [22.7, 65.9], [22.8, 68]],
        floors: 6,
        roof: 'flat',
      },
    ],
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
    name: 'Irwin Hall',
    style: 'brick',
    parts: [
      // Front block (facing the street): flat roof, arcade and glass bay.
      { footprint: [[-8, -37.2], [-9.6, -23.6], [25.8, -19.6], [27.4, -33.2]], floors: 4, roof: 'flat' },
      // Rear block: red hip roof.
      { footprint: [[-1.9, -23], [-4.4, -0.4], [15.5, 1.9], [18, -20.5]], floors: 5, roof: 'hip', style: 'stone' },
    ],
  },
  {
    id: 'SH',
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
  },
  {
    id: 'OG',
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
    name: 'Adnan Kassar School of Business',
    style: 'white',
    parts: [{ footprint: [[-167.5, 19.6], [-167.6, 36.9], [-125.8, 37.1], [-125.7, 19.8]], floors: 11, roof: 'flat' }],
  },
  {
    id: 'RNL',
    name: 'Riyad Nassar Library',
    style: 'white',
    parts: [
      { footprint: [[-167.4, -2.6], [-167.5, 19.6], [-151.5, 19.6], [-151.4, -2.6]], floors: 8, roof: 'flat' },
      { footprint: [[-151.4, -2.6], [-151.5, 14.1], [-139.4, 14.1], [-133.9, 11.2], [-131.3, 6.7], [-130.7, -2.5]], floors: 8, roof: 'flat' },
    ],
  },
  {
    id: 'UGP',
    name: 'Underground Parking',
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
  },
];
