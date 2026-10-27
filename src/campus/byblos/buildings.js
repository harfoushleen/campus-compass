// ─────────────────────────────────────────────────────────────────────────────
// LAU Byblos buildings for the 3D campus. One entry per building, same format as Beirut
// (see ../beirut/buildings.js for the full list of settings), plus two Byblos extras:
//   level     Name of the terrace the building stands on (LEVELS in site.js). The ground under
//             the building is flattened to that height.
//   below     (on a part) how many of its `floors` are below that terrace: a lobby on level 3
//             means two floors only show on the downhill side.
//
// Coordinates are metres from the campus origin (see geo.js): x = metres east, z = metres south.
// Outlines come from OpenStreetMap (© OpenStreetMap contributors), rounded. Codes and floor
// counts are from the LAU Facilities Management building pages (fm.lau.edu.lb).
// Positions marked "guess" were matched by size or placed by hand; see docs/byblos-layout.md.
//
// Stage 2 (block model): flat roofs everywhere; the real roof shapes are added in stage 3.
// ─────────────────────────────────────────────────────────────────────────────

import { orientedRect } from '../common.js';
export { FLOOR_HEIGHT, WINDOWS, ROOFS, EXTRA_COLORS, orientedRect } from '../common.js';

// Facade types, as in Beirut. Colours are read from the 3D building map.
export const STYLES = {
  sand:      { wall: '#e3d3a8', roof: '#d9d2c0', windows: 'grid', window: '#4d5a60' },        // cream stone with orange tile roofs (stage 3)
  white:     { wall: '#ecebe6', roof: '#d4d8d7', windows: 'grid' },                           // Chagoury center
  glass:     { wall: '#b9a8a2', roof: '#a9786a', windows: 'ribbon', window: '#6d8590' },      // Library: glass with a pink-brown roof
  glassGrey: { wall: '#b4bfc2', roof: '#9aa5a8', windows: 'ribbon', window: '#5f7480' },      // Central Administration
  elrc:      { wall: '#a58f78', roof: '#8d7a66', windows: 'ribbon', window: '#4d6470' },      // Engineering: brown-beige with tinted glass
  navy:      { wall: '#f1f1ef', roof: '#1f3a5f', windows: 'grid' },                           // Cafeteria: white with the dark blue curved roof
  concrete:  { wall: '#c9cccb', roof: '#b3b6b2', windows: 'none' },                           // plant, tank, drum
  parking:   { wall: '#8d9290', roof: '#8d9290', windows: 'none' },
};

export const BUILDINGS = [
  {
    id: 'BA',
    labelPriority: 1,
    name: 'Block A Building',
    label: 'Block A',
    style: 'sand',
    level: 'T4',
    // 9 floors; levels 1-2 are the underground parking F, so 7 show above the plaza.
    parts: [{ footprint: [[-17.9, -93.6], [-4.1, -82.8], [28, -123.5], [14.2, -134.2]], floors: 9, below: 2, floorHeight: 3.2, roof: 'flat' }],
  },
  {
    id: 'RHB',
    labelPriority: 1,
    name: 'Residence Hall Block B',
    label: 'Residence B',
    style: 'sand',
    level: 'T2',
    // 9 levels: store, two parking levels (E), then six floors of rooms above the Lower Gate road.
    parts: [{ footprint: [[-100.9, -47.9], [-91.4, -30], [-35.7, -58.8], [-45.1, -76.8]], floors: 9, below: 3, floorHeight: 3.2, roof: 'flat' }],
  },
  {
    id: 'RHC',
    name: 'Residence Hall Block C',
    label: 'Residence C',
    style: 'sand',
    level: 'T0',
    // guess: OSM building 986149009, matched by its area (300 m²); the map only shows an arrow pointing west.
    parts: [{ footprint: [[-436.9, -84.8], [-423.5, -78.7], [-431.2, -62], [-445.5, -68.5], [-443.1, -73.7], [-445.3, -74.7], [-442.4, -80.9], [-439.3, -79.6]], floors: 3, roof: 'flat' }],
  },
  {
    id: 'LIB',
    labelPriority: 1,
    name: 'Joseph G. Jabbra Library',
    label: 'Library',
    style: 'glass',
    level: 'T4',
    // 5 floors; the lobby is on level 3, so two floors show only on the downhill (north) side.
    parts: [{ footprint: [[44.7, -111.2], [53.7, -94.9], [56, -64.4], [75.1, -68.1], [76.2, -81.4], [78.8, -85.4], [74.7, -88.2], [73.2, -99.7], [71, -100], [72, -110.7], [63, -119.9], [51.2, -117.6]], floors: 5, below: 2, roof: 'flat' }],
  },
  {
    id: 'RNCA',
    name: 'Riyad Nassar Central Administration',
    label: 'Central Administration',
    style: 'glassGrey',
    level: 'T4',
    parts: [{ footprint: [[75.5, -57.7], [74.2, -47.1], [80.3, -42.8], [105.4, -69.5], [90.8, -81.4], [81.9, -61.9]], floors: 5, below: 2, roof: 'flat' }],
  },
  {
    id: 'SCI',
    labelPriority: 1,
    name: 'Science Building',
    style: 'sand',
    level: 'T3',
    parts: [{ footprint: [[-54.9, 14.8], [-47.5, 30], [-35.4, 24.2], [-37.8, 19.5], [-11.6, 6.9], [-9.6, 10.9], [1.9, 5.4], [-5.2, -9.1]], floors: 7, roof: 'flat' }],
  },
  {
    id: 'TR',
    name: 'Tohme-Rizk Hall',
    style: 'sand',
    level: 'T6',
    parts: [{ footprint: [[-44, 32.6], [-43.6, 39.4], [-12.8, 37.7], [-13.1, 30.8]], floors: 4, roof: 'flat' }],
  },
  {
    id: 'ARC',
    name: 'Architecture Hall',
    style: 'sand',
    level: 'T5',
    parts: [{ footprint: [[-0.5, 22.9], [1, 38.5], [28.5, 35.8], [28, 31.5], [36.1, 30.8], [35.2, 21.9], [31, 22.3], [31.2, 23.8], [14.3, 25.4], [13.9, 21.6]], floors: 6, roof: 'flat' }],
  },
  {
    id: 'ZH',
    labelPriority: 1,
    name: 'Zakhem Hall',
    style: 'sand',
    level: 'T5',
    parts: [{ footprint: [[39.7, 31.8], [32, 46.1], [80.7, 72.2], [88.5, 57.9], [77.1, 51.8], [75.2, 55.3], [50.6, 42.2], [52.5, 38.6]], floors: 7, roof: 'flat' }],
  },
  {
    id: 'BSL',
    name: 'Semaan Melkan Bassil Hall',
    label: 'Bassil Hall',
    style: 'sand',
    level: 'T5',
    // guess: OSM building 987117571 (181 m², small for 5 floors at FM's 1,214 m²).
    parts: [{ footprint: [[70.5, 24.4], [75.4, 19.9], [93.9, 40], [88.9, 44.4]], floors: 5, roof: 'flat' }],
  },
  {
    id: 'FCC',
    labelPriority: 1,
    name: 'Frem Civic Center',
    style: 'sand',
    level: 'T7',
    parts: [{ footprint: [[129.5, 12.4], [147, 12.8], [145.7, 73.6], [148.8, 73.7], [148.7, 78.5], [142.2, 78.4], [142.1, 81.7], [138.3, 81.6], [138.3, 77.8], [131.8, 77.7], [131.9, 71.9], [128.1, 71.8], [128.3, 63.4], [129.8, 63.4], [129.9, 58.5], [127.5, 58.4], [128, 34.9], [121.4, 34.8], [121.5, 27.9], [129.2, 28.1]], floors: 5, roof: 'flat' }],
  },
  {
    id: 'CHSC',
    labelPriority: 1,
    name: 'Gilbert and Rose-Marie Chagoury Health Sciences Center',
    label: 'Health Sciences Center',
    style: 'white',
    level: 'T7',
    parts: [{ footprint: [[96.3, -46.3], [133.4, -6.4], [164.2, -36.5], [162, -37.8], [152.3, -36.9], [122.5, -70.4]], floors: 6, roof: 'flat' }],
  },
  {
    id: 'ELRC',
    labelPriority: 1,
    name: 'Engineering Laboratories and Research Center',
    label: 'Engineering Labs',
    style: 'elrc',
    level: 'T8',
    // 7 levels; level 1 (shelter and testing room) is below the entrance.
    parts: [{ footprint: [[238.9, 59.4], [245.9, 66.6], [242.3, 70.1], [284.2, 113.9], [295.9, 102.9], [246.9, 51.8]], floors: 7, below: 1, roof: 'flat' }],
  },
  {
    id: 'STC',
    name: 'Student Center',
    style: 'concrete',
    level: 'T4',
    // guess: OSM building 1191770841 (366 m²; FM lists 1,227 m² on "level 1", so the match is doubtful).
    parts: [{ footprint: [[18.8, -24.9], [13.9, -16.3], [2.5, -10.7], [1, -13.4], [-4.8, -10.5], [0.7, 0.2], [8, -4.1], [11.1, 1], [20.3, -3.5], [18, -6.6], [20.3, -8.8], [24.4, -15.9], [27.1, -20.6]], floors: 2, roof: 'flat' }],
  },
  {
    id: 'SC',
    name: 'Service Center',
    style: 'sand',
    level: 'T4',
    // guess: placed by hand next to the Student Center (154 m² footprint x 3 floors = FM's 478 m²).
    parts: [{ footprint: orientedRect(38, -8, 14, 11, 0), floors: 3, roof: 'flat' }],
  },
  {
    id: 'CAF',
    name: 'Cafeteria',
    style: 'navy',
    level: 'T6',
    // Placed inside the OSM "Cafateria" zone (x -96 to -71, z 17 to 54): cafeteria upstairs, Athletics Office below.
    parts: [{ footprint: orientedRect(-84, 36, 26, 14, 90), floors: 2, roof: 'flat' }],
  },
  {
    id: 'HC',
    name: 'LAU Health Clinic (Gate House)',
    label: 'Health Clinic',
    style: 'sand',
    level: 'T0',
    // guess: placed by hand at the entrance of Lower Parking A.
    parts: [{ footprint: orientedRect(-335, 28, 12, 10, 0), floors: 1, roof: 'flat' }],
  },
  {
    id: 'AF',
    name: 'Animal Facility',
    label: 'Flex Space Labs',
    style: 'concrete',
    level: 'T9',
    // guess: OSM building 1191749379, matched by area (177 m²) and its place at the east end of the master plan.
    parts: [{ footprint: [[315.9, 108.3], [310.1, 109.4], [313.1, 125.4], [302.3, 127.4], [303.4, 133.6], [320, 130.5]], floors: 1, roof: 'flat' }],
  },
  {
    id: 'WT',
    labelPriority: 3,
    name: 'Water Tank',
    style: 'concrete',
    level: 'T9',
    // guess: only labelled on the parking map; OSM building 787559643.
    parts: [{ footprint: [[349.6, 82.1], [366.8, 95.4], [370.3, 91], [375.4, 95], [379.4, 90], [373.5, 85.4], [377.9, 79.7], [361.8, 67.2], [353.9, 61], [347.1, 69.7], [354.7, 75.6]], floors: 2, roof: 'flat' }],
  },
  {
    id: 'INF',
    labelPriority: 3,
    name: 'Infrastructure Plants',
    label: 'Infrastructure',
    style: 'concrete',
    level: 'T10',
    // guess: the long service complex south of the campus (OSM 1191770839 and 1191749375).
    parts: [
      { footprint: [[6.7, 119.4], [4, 125.8], [-0.8, 123.8], [-5.8, 135.7], [36, 152.9], [43.6, 134.6]], floors: 2, roof: 'flat' },
      { footprint: [[83.7, 135.4], [85.6, 151.1], [136.8, 145], [136.1, 138.5], [139.4, 138.1], [138.7, 132.4], [135.3, 132.8], [134.9, 129.3]], floors: 2, roof: 'flat' },
    ],
  },
  {
    id: 'UGP',
    labelPriority: 3,
    name: 'Byblos Underground Parking',
    label: 'Parking (G)',
    style: 'parking',
    underground: true,
    level: 'T4',
    // Only the entrance drum beside the Main Gate is drawn. The parking layer also outlines the five levels below the main plaza.
    parts: [{ footprint: orientedRect(42, -54, 7, 7, 0), floors: 1, floorHeight: 4, roof: 'flat' }],
    extras: [{ shape: 'cylinder', at: [42, -54], size: 4.5, base: 'ground', height: 5, color: '#9a9e9b' }],
  },
];
