// ─────────────────────────────────────────────────────────────────────────────
// Everything in the 3D Byblos campus that isn't a building: terrain, gates, parking,
// the horizon, camera and colours. Same layout as ../beirut/site.js.
// Coordinates: metres, x = east, z = south (see geo.js); y = metres above the datum below.
//
// Stage 3 added the landscaping: paths, stairs, lawns, trees, the fountains, the amphitheater and the courts. None of it is in
// OpenStreetMap, so all of it is traced from the official 3D map and the master plan (positions about 15 m accurate).
// ─────────────────────────────────────────────────────────────────────────────
import dem from './dem.json';
import { BUILDINGS } from './buildings.js';
import { orientedRect, SCENE as BASE_SCENE } from '../common.js';

// Settings shared with the other campuses (labels, light/dark scene, night lights...).
export { LABELS, HANGOUT_COLORS, FLY_DURATION, NIGHT_WINDOWS, LAMPS } from '../common.js';

// Light and dark scene: as shared, but with a hazy blue sky behind the hills instead of Beirut's dark backdrop.
export const SCENE = {
  light: { ...BASE_SCENE.light, background: '#b4cadb', sky: '#f4f8ff' },
  dark: { ...BASE_SCENE.dark, background: '#0b121c' },
};

// Area of the 3D scene (also limits how far the camera can pan).
export const BOUNDS = { minX: -520, maxX: 420, minZ: -260, maxZ: 220 };

// ── Ground / hill ──
// Heights (y) are metres above the datum: Lower Parking A, which is about 215 m above sea level.
// So the Engineering center (y ≈ 76) is at about 290 m.
export const DATUM_ABOVE_SEA = 215;

// The ground is built in three layers (see buildHeightField below):
//   1. the overall slope: NASA SRTM 30 m elevation (dem.json), smoothed, with the steep drop on the
//      north side (below Block A and Residence B) added by hand, as seen in the official 3D map;
//   2. flat terraces: every building's footprint is levelled to its `level`, plus the open areas below;
//   3. ramps along the roads that join the terraces.
// Every terrace height is an estimate: fitted to the SRTM values and tuned against the official 3D map.
// To be checked on site (they are listed in docs/byblos-layout.md).
export const LEVELS = {
  T0: 36,  // Lower Parking A, Health Clinic (Gate House), Residence C, start of the lower road. 36 m above the SRTM value: see the note above RAMPS
  // T1 is the lower road along Lower Parking B (RAMPS below): about 40 m, nearly level, dropping to T2 at the Lower Gate
  T2: 35,  // Lower Gate, Residence Hall B, lots D and E
  T3: 39,  // Science Parking C, Science Building
  T4: 63,  // Main Gate, the main plaza, Library, Central Administration, Block A, Student Center, Service Center
  T5: 62,  // fountain plaza, Zakhem, Architecture and Bassil halls
  T6: 50,  // Upper Gate road: Cafeteria, courts, Tohme-Rizk Hall, lot I
  T7: 67,  // Chagoury Health Sciences Center, Frem Civic Center, lot K
  T8: 76,  // Engineering center
  T9: 84,  // Animal Facility, Water Tank
  T10: 30, // Infrastructure Plants (south of the campus)
};

// Open terraces that aren't under a building. `paved` areas also turn the ground from forest green to stone.
// blend = metres over which the terrace's edge melts into the slope around it.
export const TERRACES_LEVELLED = [
  { level: 'T0', blend: 12, points: [[-414, -12], [-404, 31], [-365, 50], [-306, 65], [-302, 41], [-306, 20], [-334, 12], [-360, 6]] },                           // Lower Parking A
  { level: 'T2', blend: 9, points: [[-138, -52], [-96, -54], [-62, -80], [-30, -62], [-66, -8], [-112, -4], [-138, -22]] },                                      // Lower Gate, Residence B, lots D and E
  { level: 'T3', blend: 8, points: [[-67, -50], [-4, -50], [17, -32], [-6, -19], [-58, 7], [-67, -11]] },                                                       // Parking C
  { level: 'T4', blend: 8, points: [[-10, -58], [24, -72], [60, -64], [82, -46], [62, -14], [30, -18], [-5, -35]] },                                             // main plaza
  { level: 'T5', blend: 8, points: [[15, -12], [62, -14], [98, -10], [100, 14], [86, 28], [40, 22], [15, 18]] },                                                // fountain plaza
  { level: 'T6', blend: 9, points: [[-140, 12], [-70, 14], [-10, 28], [-12, 75], [-75, 78], [-140, 62]] },                                                      // Cafeteria, courts, Upper Gate road
  { level: 'T7', blend: 9, points: [[102, -72], [168, -46], [200, -4], [198, 76], [150, 88], [115, 88], [112, 30], [104, -30]] },                                // Chagoury center, Frem Civic Center, lot K
  { level: 'T8', blend: 12, points: [[225, 40], [300, 95], [300, 130], [235, 100]] },                                                                             // Engineering center
  { level: 'T9', blend: 12, points: [[296, 98], [334, 112], [330, 140], [298, 140]] },                                                                            // Animal Facility
  { level: 'T9', blend: 12, points: [[340, 58], [385, 68], [388, 100], [345, 100]] },                                                                             // Water Tank
  { level: 'T10', blend: 10, points: [[-12, 112], [50, 120], [48, 158], [-12, 150]] },                                                                            // Infrastructure Plants
  { level: 'T10', blend: 10, points: [[78, 126], [142, 124], [142, 152], [78, 156]] },
];

// The lower road (Lower Parking A and B) is drawn 30 to 36 m higher than the SRTM elevation says (SRTM: 3 m at the
// west end rising to 26 m at the Lower Gate), because that is how the official 3D map draws it: a long, nearly level road on
// an embankment, much higher on the page than the elevation data allows. To get the SRTM heights back, set T0 to 0 and the
// ramp heights to 3, 9, 15, 21, 26, 31, 35.
// Roads that climb from terrace to terrace: [x, z, y] points along the road, width and blend in metres.
export const RAMPS = [
  // Lower road: Lower Parking A (T0) -> Lower Parking B -> Lower Gate (T2)
  { width: 30, blend: 14, points: [[-335, -8, 37], [-300, -12, 40], [-250, -26, 42], [-205, -26, 42], [-165, -26, 41], [-130, -25, 38], [-100, -22, 35]] },
];

// The steep drop north of Block A and Residence B (metres taken off the SRTM slope, growing northward from z = -60).
const NORTH_DROP = { fromZ: -60, toZ: -140, depth: 36 };

// Campus boundary: Byblos draws its lighter ground from the terraces above, not from an outline.
export const CAMPUS_OUTLINE = [];

// ── Terrain height field ──
const GRID_STEP = 3; // metres between baked height samples

const smoothstep = (t) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** SRTM heights (metres above the datum), blurred a little so roofs and trees don't make bumps. */
function smoothedDem() {
  let h = dem.h.map((row) => row.slice());
  for (let pass = 0; pass < 3; pass++) {
    h = h.map((row, j) =>
      row.map((_, i) => {
        let sum = 0, n = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const v = h[j + dj]?.[i + di];
          if (v !== undefined) { sum += v; n++; }
        }
        return sum / n;
      })
    );
  }
  return h;
}

function distanceToPolygon(points, x, z) {
  let inside = false, best = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, az] = points[j], [bx, bz] = points[i];
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return inside ? 0 : best;
}

/** Nearest point on a road: { dist, y } (y interpolated along the road's [x, z, y] points). */
function nearestOnRoad(points, x, z) {
  let best = { dist: Infinity, y: 0 };
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az, ay] = points[i], [bx, bz, by] = points[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const dist = Math.hypot(x - (ax + t * dx), z - (az + t * dz));
    if (dist < best.dist) best = { dist, y: ay + (by - ay) * t };
  }
  return best;
}

function buildHeightField() {
  const { minX, maxX, minZ, maxZ } = BOUNDS;
  const nx = Math.round((maxX - minX) / GRID_STEP) + 1, nz = Math.round((maxZ - minZ) / GRID_STEP) + 1;
  const heights = new Float32Array(nx * nz), paved = new Float32Array(nx * nz);

  const demH = smoothedDem();
  const demAt = (x, z) => {
    const fx = Math.min(dem.cols - 1.001, Math.max(0, (x - dem.x0) / dem.step)), fz = Math.min(dem.rows - 1.001, Math.max(0, (z - dem.z0) / dem.step));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    return demH[j][i] * (1 - tx) * (1 - tz) + demH[j][i + 1] * tx * (1 - tz) + demH[j + 1][i] * (1 - tx) * tz + demH[j + 1][i + 1] * tx * tz;
  };

  // Flat terraces: open areas first, then each building's footprint on top.
  const flats = [
    ...TERRACES_LEVELLED.map((t) => ({ y: LEVELS[t.level], blend: t.blend, points: t.points })),
    ...BUILDINGS.filter((b) => b.level).flatMap((b) => b.parts.map((p) => ({ y: LEVELS[b.level], blend: 6, points: p.footprint }))),
  ].map((f) => {
    const xs = f.points.map((p) => p[0]), zs = f.points.map((p) => p[1]);
    return { ...f, x0: Math.min(...xs) - f.blend, x1: Math.max(...xs) + f.blend, z0: Math.min(...zs) - f.blend, z1: Math.max(...zs) + f.blend };
  });
  const ramps = RAMPS.map((r) => {
    const xs = r.points.map((p) => p[0]), zs = r.points.map((p) => p[1]), pad = r.width / 2 + r.blend;
    return { ...r, x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, z0: Math.min(...zs) - pad, z1: Math.max(...zs) + pad };
  });

  for (let j = 0; j < nz; j++) {
    const z = minZ + j * GRID_STEP;
    for (let i = 0; i < nx; i++) {
      const x = minX + i * GRID_STEP;
      let y = demAt(x, z) - NORTH_DROP.depth * smoothstep((NORTH_DROP.fromZ - z) / (NORTH_DROP.fromZ - NORTH_DROP.toZ));
      let stone = 0;
      for (const r of ramps) {
        if (x < r.x0 || x > r.x1 || z < r.z0 || z > r.z1) continue;
        const { dist, y: ry } = nearestOnRoad(r.points, x, z);
        const w = 1 - smoothstep((dist - r.width / 2) / r.blend);
        if (w > 0) y += (ry - y) * w;
      }
      for (const f of flats) {
        if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
        const w = 1 - smoothstep(distanceToPolygon(f.points, x, z) / f.blend);
        if (w > 0) { y += (f.y - y) * w; stone = Math.max(stone, w); }
      }
      heights[j * nx + i] = y;
      paved[j * nx + i] = stone;
    }
  }
  return { nx, nz, heights, paved };
}

let field;
const getField = () => (field ??= buildHeightField());

function sample(grid, x, z) {
  const { nx, nz } = getField();
  const fx = Math.min(nx - 1.001, Math.max(0, (x - BOUNDS.minX) / GRID_STEP)), fz = Math.min(nz - 1.001, Math.max(0, (z - BOUNDS.minZ) / GRID_STEP));
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const a = grid[j * nx + i], b = grid[j * nx + i + 1], c = grid[(j + 1) * nx + i], d = grid[(j + 1) * nx + i + 1];
  return a * (1 - tx) * (1 - tz) + b * tx * (1 - tz) + c * (1 - tx) * tz + d * tx * tz;
}

/** Ground height (m above the datum) at a point. */
export const heightAt = (x, z) => sample(getField().heights, x, z);

/** 0..1: how much the ground at a point is stone (campus) rather than forest. */
export const groundMask = (x, z) => sample(getField().paved, x, z);

// ── Beyond the scene ──
// The hillside carries on past BOUNDS at the edge's height and falls away a little (HORIZON.fall metres over
// HORIZON.fallDistance), fading into the sky in the haze (fog: where it starts and where it is complete).
// Drawn by components/campus/Horizon.jsx. There is no sea or old town in the model.
export const HORIZON = {
  span: 14000,       // how far the ground reaches
  fall: 40,
  fallDistance: 3000,
  fog: [1800, 9000],
  color: '#3b5f40',
};

// ── Surrounding city ──
// The neighbouring village houses are left out on purpose (the official map shows only forest around the campus).
// So there is no SURROUNDINGS setting and osm-surroundings.json holds only the roads.

// ── Landscaping ──
// Trees (pines and cypresses): random positions inside each cluster (the same every load), or evenly along a row.
// Trees never grow inside buildings, on paths or stairs, or in garden patches.
export const TREES = {
  clusters: [
    { center: [-96, 12], radius: 14, count: 16 },   // pines by the Cafeteria and courts
    { center: [-60, 30], radius: 10, count: 8 },
    { center: [30, -20], radius: 8, count: 5 },     // main plaza
    { center: [0, -145], radius: 35, count: 18 },   // the wooded slope below Block A
    { center: [-80, -100], radius: 30, count: 14 },
    { center: [-150, -60], radius: 35, count: 14 },
    { center: [60, -150], radius: 40, count: 14 },
    { center: [-50, 110], radius: 60, count: 20 },  // the slope behind the campus
    { center: [200, 110], radius: 30, count: 10 },
    { center: [330, 60], radius: 30, count: 10 },
  ],
  rows: [
    { from: [-300, 16], to: [-175, 8], count: 16 },  // along the lower road
    { from: [-345, -48], to: [-250, -52], count: 10 },
  ],
  colors: ['#2c5a38', '#3b6b44'],
  trunk: '#6b4f3a',
};

// Stone amphitheater beside Bassil Hall, open to the north (FM's grounds page lists one; position from the 3D map).
export const AMPHITHEATER = { center: [60, 12], radius: 9, tiers: 5, color: '#b9a58a' };

// The two outdoor courts beside the Cafeteria (mini-football, tennis, volleyball, basketball): at = centre,
// size = [width, length], angle = direction of the length in degrees from east toward south.
export const COURTS = [
  { at: [-127, 35], size: [14, 30], angle: 90 },
  { at: [-110, 35], size: [14, 30], angle: 90 },
];

// Surface parking lots get white bay lines (see PARKING below).
export const PARKING_BAYS = true;

// ── Hangout spots: 3D touches ── (fountains, benches...; the spots themselves are places, added in stage 4)
// Same format as Beirut: benches [[x, z, angle], ...], fountain { at, radius }, grass { at, size }.
export const HANGOUT_DECOR = {
  'FOUNTAIN-PLAZA': {
    fountain: { at: [92, 0], radius: 5 },
    grass: { at: [92, 0], size: [9, 9] },
    benches: [[92, -7.5, 0], [92, 7.5, 180], [84.5, 0, 270], [99.5, 0, 90]],
  },
  'FOUNTAIN-ARCHITECTURE': {
    fountain: { at: [44, 11], radius: 2 }, // the OSM fountain by Architecture Hall
    benches: [[44, 6.5, 0], [44, 15.5, 180]],
  },
  'MAIN-PLAZA': {
    benches: [[34, -44, 90], [40, -36, 90], [56, -14, 0], [62, -2, 0]],
  },
  'COURTS-SEATING': {
    benches: [[-127, 55, 180], [-110, 55, 180], [-96, 54, 180]],
  },
};

// ── Paths and stairs ──
// Paths: lines of [x, z] points laid on the ground, `width` in metres. Stairs: from one point to another; the height
// gained follows the ground. Traced from the official 3D map (about 15 m accuracy); trees keep clear of them and lamps
// line the paths at night.
export const PATHS = [
  { id: 'mainPromenade', width: 6, points: [[26, -60], [30, -50], [34, -40], [40, -30], [48, -18], [56, -8], [64, 4]] },  // from the Main Gate
  { id: 'plazaToFountain', width: 5, points: [[64, 4], [78, 10], [90, 8], [98, -2]] },
  { id: 'libraryWalk', width: 4, points: [[30, -52], [42, -56], [54, -60]] },
  { id: 'rncaWalk', width: 4, points: [[50, -30], [62, -38], [74, -42]] },
  { id: 'scienceFront', width: 4, points: [[-61, -20], [-50, -12], [-38, -6], [-24, -3], [-8, -14], [6, -24]] },           // from the Lower Gate
  { id: 'upperRoad', width: 3, points: [[4, 12], [-8, 26], [-28, 42], [-48, 54], [-69, 64]] },                              // to the Upper Gate
  { id: 'cafeteria', width: 3, points: [[-69, 64], [-74, 52], [-80, 48]] },
  { id: 'courts', width: 3, points: [[-84, 52], [-98, 56], [-118, 56]] },
  { id: 'architecture', width: 3, points: [[60, -4], [46, 6], [30, 14], [20, 20]] },
  { id: 'bassil', width: 3, points: [[98, -2], [100, 14], [92, 28]] },
  { id: 'eastPromenade', width: 5, points: [[98, -2], [112, 6], [128, 10], [146, 8], [160, 14], [172, 20]] },             // toward the Chagoury and Frem buildings
  { id: 'engineering', width: 3, points: [[194, 60], [212, 66], [232, 64], [240, 66]] },
  { id: 'blockA', width: 3, points: [[-10, -72], [-20, -68], [-30, -64]] },
];

export const STAIRS = [
  { id: 'scienceUp', from: [-4, -26], to: [12, -44], width: 5, steps: 34 },  // Science Parking up to the main plaza
  { id: 'cafeDown', from: [-2, 22], to: [-18, 32], width: 4, steps: 22 },    // fountain plaza down to the Upper Gate road
  { id: 'engineeringUp', from: [226, 56], to: [238, 62], width: 5, steps: 16 }, // up to the Engineering center
];

// ── Garden patches ── green lawns with a few bushes and flower clumps. `points` is the outline ([x, z] corners).
export const PATCHES = [
  { id: 'mainLawn', shrubs: 3, flowers: 4, points: [[-2, -50], [12, -58], [20, -52], [8, -42]] },
  { id: 'plazaLawn', shrubs: 3, flowers: 5, points: [[46, -34], [60, -44], [70, -32], [56, -24]] },
  { id: 'fountainLawn', shrubs: 3, flowers: 5, points: [[72, -18], [88, -24], [96, -10], [78, -4]] },
  { id: 'cafeLawn', shrubs: 2, flowers: 4, points: [[-68, 20], [-56, 26], [-60, 40], [-72, 34]] },
];

// ── Off-screen markers ──
// When one of these buildings is off-screen, a small marker at the edge of the view points to it (tap = fly there).
export const OFFSCREEN_MARKERS = [
  { buildingId: 'RHC', labelKey: 'marker.rhc', viewDistance: 320 },
  { buildingId: 'AF', labelKey: 'marker.af', viewDistance: 320 },
];

// ── Gates ──
// `position`: where the gatehouse stands. `labelHeight`: how high its label floats.
// Positions are read from the master plan and the OSM road junctions (about 15 m accuracy).
export const GATES = [
  { id: 'main', name: 'Main Gate', position: [26, -60], labelHeight: 12 },
  { id: 'lower', name: 'Lower Gate', position: [-61, -20], labelHeight: 12 },
  { id: 'upper', name: 'Upper Gate', position: [-69, 64], labelHeight: 12 },
];

// ── Parking layer ── (shown with the "Parking" category)
// `area`: outline of the lot. `badge`: where the P + letter marker floats. `placeId`: the matching entry in places.json.
// Lots A, B, C, I and K are OSM outlines; D, E, F, G, H and J are read from the master plan (about 25 m accuracy).
// Lot H is on the master plan but not in the FM list, so it has no place.
export const PARKING = [
  {
    code: 'A', name: 'Lower Parking (RIGHT)', access: 'Students', placeId: 'P-A',
    area: [[-413.6, -9.4], [-414.1, -4.8], [-403.5, 31.1], [-365.2, 50.2], [-306.3, 65.5], [-302.1, 41.4], [-306.1, 20.5], [-334.3, 12.3], [-360.2, 6.3], [-406.7, -12.5]],
    badge: [-360, 30],
  },
  {
    code: 'B', name: 'Lower Parking (LEFT)', access: 'Students', placeId: 'P-B',
    area: [[-344.5, -9.6], [-327.2, -0.7], [-312.9, -23.3], [-315.1, -3.9], [-308.5, -3.2], [-309.2, 4.2], [-294.4, 3.2], [-276.1, -3.9], [-263.5, -16.2], [-248.6, -15.7], [-170.8, -15.4], [-156.2, -16.7], [-154.4, -23.8], [-160.1, -31.9], [-171, -34.6], [-197, -32.9], [-236, -33.9], [-266.7, -37.8], [-282.4, -39.9], [-297.8, -42], [-317.8, -41], [-327, -36.8]],
    badge: [-240, -24],
  },
  {
    code: 'C', name: 'Science Parking', access: 'Faculty/Staff/LAU Vehicles', placeId: 'P-C',
    area: [[-58.3, 7.2], [-67.3, -11.3], [-66.1, -18.7], [-3.9, -50.1], [17.2, -31.9], [-5.8, -19.2]],
    badge: [-30, -22],
  },
  {
    code: 'D', name: 'Residence Hall B Outdoor Parking', access: 'Dorms Students', placeId: 'P-D',
    area: orientedRect(-108, -38, 26, 12, -20),
    badge: [-108, -38],
  },
  {
    code: 'E', name: 'Residence Hall B Underground Parking', access: 'Faculty/Staff', placeId: 'P-E',
    area: [[-100.9, -47.9], [-91.4, -30], [-35.7, -58.8], [-45.1, -76.8]],
    underground: true, badge: [-68, -53],
  },
  {
    code: 'F', name: 'Block A Underground Parking', access: 'Faculty/Staff', placeId: 'P-F',
    area: [[-17.9, -93.6], [-4.1, -82.8], [28, -123.5], [14.2, -134.2]],
    underground: true, badge: [5, -109],
  },
  {
    code: 'G', name: 'Byblos Underground Parking', access: 'Students/Faculty/Staff', placeId: 'P-G',
    area: orientedRect(35, -40, 56, 44, 0), // under the main plaza, five levels
    underground: true, badge: [35, -40],
  },
  {
    code: 'H', name: 'Parking H', access: '', placeId: null, // on the master plan only
    area: orientedRect(-204, 31, 22, 16, 0),
    badge: [-204, 31],
  },
  {
    code: 'I', name: 'Upper Gate Parking', access: 'Faculty/Staff', placeId: 'P-I',
    area: [[-61.3, 48.8], [-61.6, 69.8], [-44.7, 71.3], [-19.8, 60.9], [-19.6, 53.2], [-14.3, 52.4], [-14.9, 41.7]],
    badge: [-40, 58],
  },
  {
    code: 'J', name: 'ELRC Parking (front)', access: 'Faculty/Staff', placeId: 'P-J',
    area: orientedRect(42, 76, 26, 8, 20), // the maps put it beside Zakhem Hall; FM says "in front of the ELRC"
    badge: [42, 76],
  },
  {
    code: 'K', name: 'FCC Parking (back)', access: 'Faculty/Staff', placeId: 'P-K',
    area: [[158.5, 17.2], [156.7, 39], [154.1, 70.3], [191.8, 73.1], [194.2, 10.7], [177.3, 5.8], [165.1, 7.1]],
    badge: [175, 40],
  },
];

// ── Camera ──
// The default view matches the angle of the official 3D map (3d-map-byblos-buildings.pdf). It was fitted to
// 15 landmarks picked in that image (see docs/byblos-layout.md). `fov` is the vertical field of view for a
// landscape screen as wide as the image (aspect 2.59); narrower screens move the camera back.
export const CAMERA = {
  target: [-145, 50, 56],
  position: [-292, 225, -296],
  fov: 33.5,
  referenceAspect: 1700 / 657,
  narrowTarget: [-20, 50, 15], // phones (narrower than narrowBelowAspect) look at the middle of the buildings instead
  narrowBelowAspect: 2.2,
  narrowScreenFit: 0.62, // 1 = always fit the full width on narrower screens, lower = closer (sides cropped)
  near: 5,
  far: 20000,            // the hillside and haze reach far
  targetHeight: [-230, 160], // how high or low the point the camera orbits around may go (the hill is steep)
  maxFrameDistance: 700,
  // Orbit limits
  minDistance: 40,
  maxDistance: 2400,
  minPolarAngle: 0.15,              // radians from straight down (0 = top view)
  maxPolarAngle: (82 * Math.PI) / 180, // stops the camera before it reaches the ground
};

// ── Colours ──
export const COLORS = {
  background: '#3d4a45', // outside the scene
  campusGround: '#cfc7ad', // stone paving on the terraces
  forest: '#3b5f40',       // the wooded hillside around the campus
  street: '#4a4d4c',       // asphalt: dark, as on the official map
  highlight: '#ffcf70',
  selected: '#ffb84d',
  dimmed: '#9fa3a1',
  path: '#a39b86',   // paving: darker than the terraces so the paths read
  patch: '#6e9a4a',
  stairs: '#cfc9b8',
};
