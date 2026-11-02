// ─────────────────────────────────────────────────────────────────────────────
// Everything in the 3D Byblos campus that isn't a building: terrain, gates, parking,
// the horizon, camera and colours. Same layout as ../beirut/site.js.
// Coordinates: metres, x = east, z = south (see geo.js); y = metres above the datum below.
//
// Stage 3 added the landscaping: paths, stairs, lawns, trees, the fountains, the amphitheater and the courts. None of it is in
// OpenStreetMap, so all of it is traced from the official 3D map and the master plan (positions about 15 m accurate).
// ─────────────────────────────────────────────────────────────────────────────
import dem from './dem.json';
import osmData from './osm-surroundings.json';
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
// (A multiple of the 3 m height grid wide, so the drawn ground has a vertex at every grid point and stays exactly level where the grid is.)
export const BOUNDS = { minX: -520, maxX: 419, minZ: -260, maxZ: 220 };

/** Metres between the vertices of the drawn ground: the height grid's own step, so no road or terrace edge falls between vertices. */
export const TERRAIN_STEP = 3;

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
  T9: 78,  // Animal Facility, Water Tank (6 m lower than the SRTM value, so the ring road can climb to it)
  TA: 57.5, // the sunken amphitheater and café court between the Library and the Central Administration (5.5 m below the plaza, see HOLLOWS)
  T10: 40, // Infrastructure Plants (south of the campus; 10 m above the SRTM value so a service road can reach them)
};

// Open terraces that aren't under a building. `paved` areas also turn the ground from forest green to stone.
// blend = metres over which the terrace's edge melts into the slope around it.
export const TERRACES_LEVELLED = [
  { level: 'T0', blend: 12, points: [[-414, -12], [-404, 31], [-365, 50], [-306, 65], [-302, 41], [-306, 20], [-334, 12], [-360, 6]] },                           // Lower Parking A
  { level: 'T2', blend: 9, points: [[-138, -52], [-96, -54], [-62, -80], [-30, -62], [-66, -8], [-112, -4], [-138, -22]] },                                      // Lower Gate, Residence B, lots D and E
  { level: 'T3', blend: 8, points: [[-67, -11], [-69, -21], [-40, -35], [-4, -50], [17, -32], [-6, -19], [-58, 7]] },                                            // Parking C (hugs the lot, so Residence B's forecourt keeps its own level)
  { level: 'T4', blend: 8, points: [[-10, -58], [24, -72], [60, -64], [82, -46], [62, -14], [30, -18], [-5, -35]] },                                             // main plaza
  { level: 'T4', blend: 8, points: [[-36, -84], [-34, -68], [-14, -56], [2, -62], [10, -76], [-2, -92], [-14, -100], [-26, -98]] },                              // Block A's forecourt: the junction, the round drum and the building's south-west end
  { level: 'T4', blend: 6, points: [[-4.1, -82.8], [28, -123.5], [34.3, -118.5], [2.2, -77.8]] },                                                                // the paved apron along Block A's south-east face
  { level: 'T5', blend: 8, points: [[15, -12], [62, -14], [98, -10], [100, 14], [86, 28], [40, 22], [15, 18]] },                                                // fountain plaza
  { level: 'T5', blend: 4, points: [[34, 22], [60, 22], [60, 34], [44, 34], [36, 30]] },                                                                          // the pocket between Architecture Hall, Zakhem Hall and the plaza
  { level: 'T5', blend: 6, points: [[-4, 12], [16, 12], [16, 22], [-4, 24]] },                                                                                     // the plaza reaches the top of the stairs to the Upper Gate road, north of Architecture Hall
  { level: 'T6', blend: 9, points: [[-140, 12], [-70, 14], [-10, 28], [-12, 75], [-75, 78], [-140, 62]] },                                                      // Cafeteria, courts, Upper Gate road
  { level: 'T7', blend: 9, points: [[102, -72], [168, -46], [200, -4], [198, 76], [150, 78], [115, 78], [112, 30], [104, -30]] },                                // Chagoury center, Frem Civic Center, lot K
  { level: 'T8', blend: 12, points: [[225, 40], [300, 95], [300, 130], [235, 100]] },                                                                             // Engineering center
  { level: 'T9', blend: 12, points: [[296, 98], [334, 112], [330, 140], [298, 140]] },                                                                            // Animal Facility
  { level: 'T9', blend: 12, points: [[340, 58], [385, 68], [388, 100], [345, 100]] },                                                                             // Water Tank
  { level: 'T10', blend: 10, points: [[-12, 112], [50, 120], [48, 158], [-12, 150]] },                                                                            // Infrastructure Plants
  { level: 'T10', blend: 10, points: [[78, 126], [142, 124], [142, 152], [78, 156]] },
  { level: 'T10', blend: 6, points: [[42, 130], [84, 130], [84, 146], [42, 146]] },                                                                                 // service road between the two Infrastructure buildings
  { level: 'T0', blend: 8, points: [[-420, -14], [-402, -14], [-402, -28], [-414, -36], [-424, -36]] },                                                          // west end of the Lower Parking A platform, where the road to Residence C leaves
  { level: 'T0', blend: 7, points: [[-436, -56], [-418, -56], [-418, -80], [-436, -86]] },                                                                        // in front of Residence C
  { level: 'T9', blend: 6, points: [[304, 98], [336, 82], [346, 92], [318, 108]] },                                                                                // the drive between the Animal Facility and the Water Tank
];

// Sunken courts: ground cut below its surroundings, applied after the pads so it reaches right up to the buildings' walls (which then
// stand on the lower floor). Inside `points` the ground is exactly at `level`; it melts into the slope over `blend` metres outside,
// except under a building's pad. The Library and the Central Administration form "an open amphitheater" between them, against the
// excavated rock (Atelier Pagnamenta Torriani; LAU FM: "the resulting interstitial space forms a sunken amphitheater"): a broad
// stair comes down from the plaza (STAIRS amphitheaterSteps), a café court on the floor, open to the slope on the north side.
export const HOLLOWS = [
  { id: 'libraryAmphitheater', level: 'TA', blend: 5, points: [[79.5, -75.5], [86, -75.5], [88.5, -82], [89, -90], [80.5, -90], [81.5, -86.5], [80.5, -83], [78.8, -80], [78.5, -76]] },
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

// ── Roads: level ground under every road ──
// A road is never left to follow the hill sideways: the ground is levelled across its width (and beyond it, ROAD_FLAT),
// then melts into the slope over ROAD_SHOULDER metres, a cut or an embankment. Along the road the ground follows its height profile:
//   - OpenStreetMap roads: the ground's own height along the road, smoothed over ROAD_SMOOTH metres each way, so no bumps;
//   - GRADED roads below: heights chosen by hand ([x, z, y] points), where the smoothed ground would give a cliff or a ditch.
const ROAD_FLAT = 5; // the drawn ground has a vertex every 3 m: this keeps all those under the road, and beside it, at exactly the road's height
const ROAD_SHOULDER = 5;
const ROAD_SMOOTH = 10;
const ROAD_GRADE = 0.12;   // roads are never graded steeper than this (rise over run)
const PATH_GRADE = 0.09;   // paths and ramps
const PATH_SHOULDER = 4;
const PATH_FLAT = 2.5;

// Roads and stairs with their heights set by hand, applied after the terraces. width and shoulder in metres.
// `drive: true` also draws the road (the others are OpenStreetMap roads that are already drawn, or stairs).
// Entrances come from the master plan (lau-byblos-masterplan.pdf) and the 3D map; all positions about 10 m accurate.
export const GRADED = [
  // Lower Gate road along Residence B, level with the building's ground floor (T2) and the Lower Gate.
  { id: 'lowerGateRoad', width: 9, shoulder: 6, points: [[-107, -13, 35], [-91, -16, 35], [-76, -22, 35], [-61, -30, 35], [-52, -34, 36.3]] },
  // The grand stairway from the Lower Gate road up to the main plaza: the ground climbs 27 m in 50 m, too steep for a road
  // (the road is cut here), fine for stairs. See STAIRS 'lowerGateUp'.
  { id: 'lowerGateUp', width: 6, shoulder: 8, points: [[-52, -34, 36.3], [-8, -56, 63]] },
  // The road from the main plaza junction along Block A's south-east face, easing down the hill: level with the entrance forecourt
  // at first (63), then about 15% down to its end by the building's north-east corner.
  { id: 'blockAFlank', width: 9, shoulder: 14, points: [[-9, -55, 63], [-4, -62, 63], [12, -78, 62.5], [31, -103, 58.8], [47, -123, 55], [60, -135, 52]] },
  // Block A's entrance (south-west end of its south-east face, beside the drum) from the flank road: level with the forecourt.
  { id: 'blockADrive', drive: true, width: 6, shoulder: 5, points: [[12, -78, 62.7], [8, -82, 63], [4, -86, 63]] },
  // Residence B's entrance (middle of its south-east face) from the Lower Gate road: level with the building.
  { id: 'residenceBDrive', drive: true, width: 6, shoulder: 5, points: [[-60.5, -31, 35], [-61.4, -37, 35], [-62.1, -41.7, 35]] },
  // The campus road west of Lower Parking B: level, instead of sagging 2 m between the two lots.
  { id: 'lowerRoadWest', width: 9, shoulder: 8, points: [[-342, 6, 36], [-325, 10, 36], [-311, 11, 36], [-297, 10, 36.3]] },
  // The road to Residence C: from the west end of the Lower Parking A platform along the slope to the building's door, on an embankment
  // level with the platform (36 m).
  { id: 'residenceCRoad', drive: true, width: 6, shoulder: 12, points: [[-412, -21.5, 36], [-418, -30, 36], [-423, -44, 36], [-426, -58, 36], [-427, -66, 36]] },
  // A turning circle where the road past Block A ends.
  { id: 'blockATurn', drive: true, width: 7, shoulder: 6, points: [[73.5, -138, 52], [70, -145.5, 52], [62.5, -147.5, 52], [59, -142, 52], [62.5, -134.5, 52], [70, -132.5, 52], [73.5, -138, 52]] },
  // Water Tank: a drive from the ring road past the Animal Facility, level with both (T9).
  { id: 'waterTankDrive', drive: true, width: 5, shoulder: 6, points: [[304, 100, 78], [322, 96, 78], [338, 88, 78], [350, 80, 78]] },
  // Infrastructure Plants: the spur road from the ring road reaches the platform; a service road joins the two buildings.
  { id: 'infrastructureDrive', drive: true, width: 6, shoulder: 8, points: [[-1, 88, 44.5], [3, 104, 42], [6, 118, 40]] },
  { id: 'infrastructureRoad', drive: true, width: 5, shoulder: 6, points: [[44, 136, 40], [64, 138, 40], [84, 137, 40]] },
  // Residence B's outdoor parking D (west end) from the Lower Gate road.
  { id: 'residenceBParkingDrive', drive: true, width: 5, shoulder: 5, points: [[-105, -14.5, 35], [-105.5, -23, 35], [-106, -30, 35]] },
];

/** The hand-graded roads that are drawn as roads (see GRADED); the 3D scene draws them with the streets. */
export const DRIVES = GRADED.filter((g) => g.drive).map(({ id, width, points }) => ({ id, width, points: points.map(([x, z]) => [x, z]) }));

// The OpenStreetMap roads, edited so that they form one network that can be built and walked:
//   - the road from the Lower Gate to the main plaza is cut where the ground climbs 27 m in 50 m (no road can: people take the
//     stairs, see GRADED and STAIRS), and the two roads of Parking C stop at the foot of that cliff;
//   - roads that only serve the village around the campus (the Blat road and its roundabout, the forest roads, an isolated bend
//     north of the Chagoury center) are left out: they led nowhere on the model;
//   - the campus road stops at the west edge of the Lower Parking A platform (it carries on down to the Blat road, off the model), and
//     the road past Block A ends in a turning circle (GRADED 'blockATurn');
//   - a few ends are moved to touch the building or road they were meant to serve.
const DROPPED_STREETS = [314071252, 431634969, 708713247, 708713248, 708713249, 1042555430, 1042555431, 1191749363];
function editedStreets(streets) {
  return streets.filter((s) => !DROPPED_STREETS.includes(s.id)).flatMap((s) => {
    if (s.id === 992652064) return [{ ...s, points: [[-16, -34.8], ...s.points.slice(2)] }];
    if (s.id === 992652065) return [{ ...s, points: [...s.points.slice(0, 2), [-6, -23.6]] }];
    if (s.id === 992652061) return [{ ...s, points: [[122.6, -71.2], ...s.points.slice(1)] }];   // starts at the Chagoury center's corner
    if (s.id === 249222125) return [{ ...s, points: [[247.5, 52.5], ...s.points] }];             // starts at the Engineering center
    if (s.id !== 708713250) return [s];
    const cut = (p) => p[0] > -46 && p[0] < -16 && p[1] < -35 && p[1] > -52;
    const first = s.points.findIndex(cut), last = s.points.length - 1 - [...s.points].reverse().findIndex(cut);
    const west = s.points.findIndex((p) => p[0] < -408);
    return [
      { ...s, points: s.points.slice(0, first) },                                                       // from the north end to the plaza junction
      { ...s, id: `${s.id}-lower`, points: [[-52, -34], ...s.points.slice(last + 1, west), [-412, -21.5]] }, // from the Lower Gate road to the Lower Parking A platform
    ];
  });
}

/** Roads that end on purpose where the model ends (they carry on off the model): [x, z] points. */
export const ROAD_ENDS = [[-412, -21.5]];

/** OpenStreetMap data for the 3D scene: the roads (edited as above); there are no neighbouring buildings. */
export const OSM = { ...osmData, streets: editedStreets(osmData.streets) };

// Campus boundary: Byblos draws its lighter ground from the terraces above, not from an outline.
export const CAMPUS_OUTLINE = [];

// ── Retaining walls ──
// Off. Walls generated along every pad edge (geometry.js buildWalls, WALLS settings of the form { minDrop, from, to, color, cap },
// WALL_PADS = the pads) looked like random grey blocks around the buildings; where levels change sharply the ground itself is
// now graded and the paved areas are joined by ramps and stairs instead.

// ── How surfaces are layered ──
// Roads, lawns, paths and parking lots are flat sheets just above the ground. Their heights above it differ by more than the depth
// buffer can tell apart from far away, and LAYER_OFFSET also nudges them toward the camera, so they never flicker (z-fighting).
export const LIFTS = { street: 0.14, parking: 0.28, patch: 0.28, path: 0.42, bays: 0.5 };
export const LAYER_OFFSET = true;
/** Roads and paths lie on the ground under each corner of the ribbon (they follow a cross slope instead of sinking into it). */
export const RIBBON_ON_GROUND = true;
/** Parking lots are laid over the slope, not drawn flat at one height. */
export const DRAPE_PARKING = true;
/** Trees keep off roads and parking lots too (and cliffs), not only paths and stairs. */
export const TREE_KEEP_OUT = true;
/** Buildings reach down to the lowest ground around their footprint (they never hover over a slope). */
export const BUILDING_BASE = 'terrain';

// ── The paved campus ──
// Everything inside this outline is drawn as paving (stone colour), also the strips of slope between two terraces, so the white ground
// of the campus is one connected surface joining all the buildings. Outside it the hill is forest green. (Fades over 8 m at the edge.)
export const CAMPUS_CORE = [[-76, -50], [-78, 78], [-8, 86], [110, 98], [205, 94], [214, -6], [172, -54], [112, -80], [60, -80], [26, -66], [-6, -62]];

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

/** True where an earlier road, path or stair has already levelled the ground (marked by carveRoad). */
function isMarked({ nx, mark }, x, z) {
  return mark[Math.round((z - BOUNDS.minZ) / GRID_STEP) * nx + Math.round((x - BOUNDS.minX) / GRID_STEP)] === 1;
}

/** Height of a baked grid at a point (bilinear), for the road passes that read the grid while they change it. */
function gridAt({ nx, nz, heights }, x, z) {
  const fx = Math.min(nx - 1.001, Math.max(0, (x - BOUNDS.minX) / GRID_STEP)), fz = Math.min(nz - 1.001, Math.max(0, (z - BOUNDS.minZ) / GRID_STEP));
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const a = heights[j * nx + i], b = heights[j * nx + i + 1], c = heights[(j + 1) * nx + i], d = heights[(j + 1) * nx + i + 1];
  return a * (1 - tx) * (1 - tz) + b * tx * (1 - tz) + c * (1 - tx) * tz + d * tx * tz;
}

/** A road's [x, z, y] points cut into pieces of at most `step` metres (y interpolated), with the distance along the road as a 4th value. */
function densify(points, step = 2) {
  const out = [];
  let s = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az, ay = 0] = points[i], [bx, bz, by = 0] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, ay + ((by - ay) * k) / n, s + (len * k) / n]);
    s += len;
  }
  const [lx, lz, ly = 0] = points[points.length - 1];
  out.push([lx, lz, ly, s]);
  return out;
}

/**
 * A road's or path's height profile: the ground's own height along it, averaged over `smooth` metres each way, then kept to
 * `maxGrade` (rise over run). Where it crosses a terrace or building pad (`padAt` gives that pad's level) it is exactly the pad's level
 * and stays there, so the road climbs to a pad over the distance before it instead of up a cliff.
 */
function gradedProfile(grid, points, padAt, maxGrade, smooth = ROAD_SMOOTH) {
  const dense = densify(points);
  const raw = dense.map(([x, z]) => gridAt(grid, x, z));
  // Pinned: inside a pad (its level), or within 8 m of an end that lies on ground an earlier road already levelled (that road's height), so junctions meet.
  const total = dense[dense.length - 1][3];
  const pad = dense.map(([x, z, , d], i) => padAt(x, z) ?? (Math.min(d, total - d) <= 8 && isMarked(grid, x, z) ? raw[i] : null));
  const ys = dense.map(([, , , s], i) => {
    if (pad[i] !== null) return pad[i];
    let sum = 0, n = 0;
    for (let k = i; k >= 0 && s - dense[k][3] <= smooth; k--) { sum += raw[k]; n++; }
    for (let k = i + 1; k < dense.length && dense[k][3] - s <= smooth; k++) { sum += raw[k]; n++; }
    return sum / n;
  });
  for (let pass = 0; pass < 80; pass++) {
    let changed = false;
    const clampTo = (i, j) => {
      if (pad[i] !== null) return;
      const reach = maxGrade * Math.abs(dense[i][3] - dense[j][3]);
      const v = Math.min(ys[j] + reach, Math.max(ys[j] - reach, ys[i]));
      if (Math.abs(v - ys[i]) > 1e-4) { ys[i] = v; changed = true; }
    };
    for (let i = 1; i < ys.length; i++) clampTo(i, i - 1);
    for (let i = ys.length - 2; i >= 0; i--) clampTo(i, i + 1);
    if (!changed) break;
  }
  return dense.map(([x, z], i) => [x, z, ys[i]]);
}

/**
 * Levels the ground along a road to the heights in `line` ([x, z, y] points, close together): exactly level across the road
 * and ROAD_FLAT beyond its edges, then melting into the slope over `shoulder` metres.
 */
function carveRoad({ nx, nz, heights, mark }, line, width, shoulder, flat = ROAD_FLAT) {
  const reach = width / 2 + flat + shoulder;
  const nearest = new Map(); // grid cell -> closest point of the road: { d, y }
  for (let k = 0; k < line.length - 1; k++) {
    const [ax, az, ay] = line[k], [bx, bz, by] = line[k + 1];
    const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach - BOUNDS.minX) / GRID_STEP)), i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, bx) + reach - BOUNDS.minX) / GRID_STEP));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - reach - BOUNDS.minZ) / GRID_STEP)), j1 = Math.min(nz - 1, Math.ceil((Math.max(az, bz) + reach - BOUNDS.minZ) / GRID_STEP));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = BOUNDS.minX + i * GRID_STEP, z = BOUNDS.minZ + j * GRID_STEP;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
      const d = Math.hypot(x - (ax + t * dx), z - (az + t * dz));
      if (d > reach) continue;
      const cell = j * nx + i, cur = nearest.get(cell);
      if (!cur || d < cur.d) nearest.set(cell, { d, y: ay + (by - ay) * t });
    }
  }
  for (const [cell, { d, y }] of nearest) {
    const w = 1 - smoothstep((d - width / 2 - flat) / shoulder);
    heights[cell] += (y - heights[cell]) * w;
    if (d <= width / 2 + 0.5) mark[cell] = 1;
  }
}

const PAD_EDGE = 2; // metres

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
    ...TERRACES_LEVELLED.map((t) => ({ y: LEVELS[t.level], blend: t.blend, stoneBlend: t.blend, points: t.points })),
    ...BUILDINGS.filter((b) => b.level).flatMap((b) => b.parts.map((p) => ({ y: LEVELS[b.level], blend: b.blend ?? 6, stoneBlend: 6, points: p.footprint, building: true }))),
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
        const d = distanceToPolygon(f.points, x, z), w = 1 - smoothstep(d / f.blend);
        if (w > 0) y += (f.y - y) * w;
        stone = Math.max(stone, 1 - smoothstep(d / f.stoneBlend)); // a building's long embankment stays forest green
      }
      stone = Math.max(stone, 1 - smoothstep(distanceToPolygon(CAMPUS_CORE, x, z) / 8)); // the paved campus
      heights[j * nx + i] = y;
      paved[j * nx + i] = stone;
    }
  }

  // The level of the pad (terrace or building footprint) at a point, or null: the last one that contains it, as in the loop above.
  const padAt = (x, z) => {
    for (let k = flats.length - 1; k >= 0; k--) {
      const f = flats[k];
      if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
      if (distanceToPolygon(f.points, x, z) <= PAD_EDGE) return f.y;
    }
    return null;
  };

  // Level ground under every road, path and stair. The hand-graded roads first (GRADED, exact heights), then the OpenStreetMap roads (profile = the ground's own, smoothed, kept to
  // ROAD_GRADE and pinned to the pads it crosses), then the paths, then the stairs (a straight slope
  // between their two ends, wherever those ended up).
  const grid = { nx, nz, heights, mark: new Uint8Array(nx * nz) };
  for (const g of GRADED) carveRoad(grid, densify(g.points), g.width, g.shoulder ?? ROAD_SHOULDER);
  // the long roads first, so the short ones that join them take their height where they meet
  for (const street of [...OSM.streets].sort((a, b) => b.points.length - a.points.length)) carveRoad(grid, gradedProfile(grid, street.points, padAt, ROAD_GRADE), street.width, ROAD_SHOULDER);
  for (const path of PATHS) carveRoad(grid, gradedProfile(grid, path.points, padAt, PATH_GRADE, 6), path.width, PATH_SHOULDER, PATH_FLAT);
  for (const st of STAIRS) {
    const [fx, fz] = st.from, [tx, tz] = st.to;
    carveRoad(grid, densify([[fx, fz, gridAt(grid, fx, fz)], [tx, tz, gridAt(grid, tx, tz)]]), st.width, PATH_SHOULDER, PATH_FLAT);
  }

  // Terraces and building pads keep their level: a road's cut or embankment never reaches into one (it stops at the edge), and
  // a road across a plaza is exactly as level as the plaza. Later entries win, as they did above. Grid points just outside the
  // edge count too (PAD_EDGE), so a corner of a footprint, which is drawn between grid points, is not left lower than the rest.
  for (const f of flats) {
    const i0 = Math.max(0, Math.ceil((f.x0 + f.blend - PAD_EDGE - minX) / GRID_STEP)), i1 = Math.min(nx - 1, Math.floor((f.x1 - f.blend + PAD_EDGE - minX) / GRID_STEP));
    const j0 = Math.max(0, Math.ceil((f.z0 + f.blend - PAD_EDGE - minZ) / GRID_STEP)), j1 = Math.min(nz - 1, Math.floor((f.z1 - f.blend + PAD_EDGE - minZ) / GRID_STEP));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (distanceToPolygon(f.points, minX + i * GRID_STEP, minZ + j * GRID_STEP) <= PAD_EDGE) heights[j * nx + i] = f.y;
    }
  }

  // Sunken courts (HOLLOWS): the floor exactly level, a smooth shoulder round it, building pads left alone.
  const footprints = flats.filter((f) => f.building);
  for (const h of HOLLOWS) {
    const y = LEVELS[h.level], xs = h.points.map((q) => q[0]), zs = h.points.map((q) => q[1]);
    const i0 = Math.max(0, Math.floor((Math.min(...xs) - h.blend - minX) / GRID_STEP)), i1 = Math.min(nx - 1, Math.ceil((Math.max(...xs) + h.blend - minX) / GRID_STEP));
    const j0 = Math.max(0, Math.floor((Math.min(...zs) - h.blend - minZ) / GRID_STEP)), j1 = Math.min(nz - 1, Math.ceil((Math.max(...zs) + h.blend - minZ) / GRID_STEP));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = minX + i * GRID_STEP, z = minZ + j * GRID_STEP;
      if (footprints.some((f) => distanceToPolygon(f.points, x, z) <= PAD_EDGE)) continue;
      const d = distanceToPolygon(h.points, x, z);
      if (d > h.blend) continue;
      const w = d === 0 ? 1 : 1 - smoothstep(d / h.blend), k = j * nx + i;
      heights[k] += (y - heights[k]) * w;
      paved[k] = Math.max(paved[k], w); // the court is paved
    }
  }

  // Stairs cut through whatever pad they cross, so every step stands on the ground (a straight slope between the two ends).
  for (const st of STAIRS) {
    const [fx, fz] = st.from, [tx, tz] = st.to;
    carveRoad(grid, densify([[fx, fz, gridAt(grid, fx, fz)], [tx, tz, gridAt(grid, tx, tz)]]), st.width, 3, PATH_FLAT);
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
    grass: { at: [92, 0], size: [9, 9] }, // a round lawn that fills the ring road (its edge is under the road): there is no fountain here (the user, who knows the campus)
    benches: [[100.7, -8.7, 45], [92, -15.5, 0]], // outside the ring road, facing the lawn
  },
  'FOUNTAIN-ARCHITECTURE': {
    fountain: { at: [42, 17], radius: 4.5 }, // the fountain in front of Zakhem Hall (the OSM fountain was at [44, 11]; moved off the path and enlarged)
    benches: [[42, 23.6, 180], [35.4, 17, 270]],
  },
  'MAIN-PLAZA': {
    benches: [], // set below, from the lawns (see PATCHES)
  },
  'LIBRARY-AMPHITHEATER': {
    // the café court on the floor of the sunken amphitheater: a counter against the Central Administration's wall, round tables with chairs
    kiosk: { at: [86.8, -78.4], angle: 114.5 },
    tables: [[83.2, -79.4], [83.2, -83.6], [86.4, -84.4], [84.6, -87.6]],
    benches: [[79.9, -78.4, 270], [81.2, -82.4, 270]], // against the Library's wall
  },
  'FREM-GARDEN': { benches: [[134, 3.5, 0], [142, 3.5, 0]] },
  'CHAGOURY-GARDEN': { benches: [[109, -65, 315], [113, -69, 315]] },
  'ZAKHEM-STEPS': { benches: [[41, 29, 0]] },
  'COURTS-SEATING': {
    benches: [[-127, 59.5, 180], [-110, 59.5, 180], [-96, 59.5, 180]], // behind the walk, facing the courts
  },
};

// ── Paths and stairs ──
// Paths: lines of [x, z] points laid on the ground, `width` in metres. Stairs: from one point to another; the height
// gained follows the ground. Traced from the official 3D map (about 15 m accuracy); trees keep clear of them and lamps
// line the paths at night.
export const PATHS = [
  { id: 'mainPromenade', width: 6, points: [[26, -60], [30, -50], [34, -40], [40, -30], [48, -18], [56, -8], [64, 4]] },  // from the Main Gate
  { id: 'plazaToFountain', width: 5, points: [[64, 4], [78, 10], [84.2, 8.2]] },  // stops at the outer edge of the ring road round the lawn: nothing crosses the lawn
  { id: 'libraryWalk', width: 4, points: [[30, -52], [44, -57.5], [54, -60]] },
  { id: 'rncaWalk', width: 4, points: [[43.6, -25], [62, -36], [74, -42]] },   // leaves the main promenade, to the Central Administration
  { id: 'scienceFront', width: 4, points: [[-61, -20], [-50, -12], [-38, -6], [-24, -3], [-8, -14], [6, -24]] },           // from the Lower Gate
  { id: 'upperRoad', width: 3, points: [[-30, 27], [-40, 29.8], [-47, 33], [-50, 42], [-58, 53], [-69, 64]] },                              // to the Upper Gate
  { id: 'cafeteria', width: 3, points: [[-69, 64], [-74, 52], [-80, 48]] },
  { id: 'courts', width: 3, points: [[-84, 52], [-98, 56], [-118, 56]] },
  { id: 'architectureNorth', width: 3, points: [[18, 17], [-6, 18]] },                          // from the plaza along Architecture Hall to the stairs down to the Upper Gate road
  { id: 'architecture', width: 3, points: [[60, -4], [46, 6], [30, 14], [20, 20]] },
  { id: 'bassil', width: 3, points: [[99.4, 7.6], [100, 14], [92, 28], [88.5, 33.2]] },
  { id: 'eastPromenade', width: 5, points: [[112, 5.5], [128, 10], [146, 8], [160, 14], [172, 20]] },             // toward the Chagoury and Frem buildings
  { id: 'engineering', width: 3, points: [[194, 60], [203, 63]] },
  { id: 'amphitheaterWalk', width: 3, points: [[54, -60], [66, -62.5], [74, -63.5], [79.8, -65.2]] },  // from the Library entrance along its plaza face to the head of the amphitheater stair
  { id: 'blockAFront', width: 3, points: [[-0.5, -81], [14, -100], [30, -120]] },           // along Block A's south-east face, from the entrance drive
  { id: 'zakhem', width: 3, points: [[50, 20], [48.5, 28], [46.1, 35.2]] },                   // from the fountain plaza to Zakhem Hall's door
  { id: 'residenceBFront', width: 3, points: [[-88, -28], [-62, -41.7], [-36, -55]] },       // along Residence B's south-east face, from its entrance drive
];

export const STAIRS = [
  { id: 'scienceUp', from: [-4, -26], to: [12, -44], width: 5 },  // Science Parking up to the main plaza
  { id: 'cafeDown', from: [-6, 18], to: [-30, 27], width: 4 },    // fountain plaza down to the Upper Gate road
  { id: 'amphitheaterSteps', from: [79.8, -65.2], to: [82.4, -75.5], width: 5.5 }, // the broad stair from the plaza down to the amphitheater, between the Library and the Central Administration
  { id: 'eastUp', from: [102.7, -1.8], to: [112, 5.5], width: 5 },    // fountain plaza up to the east promenade (Frem and Chagoury)
  { id: 'engineeringUp', from: [203, 63], to: [238.5, 61.2], width: 5 }, // up to the Engineering center
  { id: 'lowerGateUp', from: [-52, -34], to: [-8, -56], width: 6 },  // Lower Gate road up to the main plaza and Block A (27 m climb: see GRADED)
];

// ── Garden patches ──
// The lawns line up with the paths, as on the real plazas (LAU photos: the entrance promenade has a lawn bed on each side, kept back
// from the path by a paved curb, a round flower bed in the middle of each and a clipped hedge along the outer edge, with benches
// at the curb facing the grass). Each lawn is a strip that follows a path: `side` (+1 = the left of the path as it is drawn, -1 = the
// right), `near` and `far` = metres from the path's centre line, `from` and `to` = how far along it (0 to 1).
function pathStrip(pathId, side, near, far, from, to) {
  const { points } = PATHS.find((p) => p.id === pathId);
  const lengths = points.slice(1).map(([x, z], i) => Math.hypot(x - points[i][0], z - points[i][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  const at = (d) => { // point and unit tangent at distance d along the path
    let k = 0, rest = Math.min(Math.max(d, 0), total);
    while (k < lengths.length - 1 && rest > lengths[k]) { rest -= lengths[k]; k++; }
    const [ax, az] = points[k], [bx, bz] = points[k + 1], t = rest / lengths[k];
    return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, tx: (bx - ax) / lengths[k], tz: (bz - az) / lengths[k] };
  };
  const inner = [], outer = [];
  const steps = Math.max(2, Math.ceil(((to - from) * total) / 3));
  for (let i = 0; i <= steps; i++) {
    const { x, z, tx, tz } = at((from + ((to - from) * i) / steps) * total);
    const nx = tz * side, nz = -tx * side; // the side of the path the lawn is on
    inner.push([+(x + nx * near).toFixed(2), +(z + nz * near).toFixed(2)]);
    outer.push([+(x + nx * far).toFixed(2), +(z + nz * far).toFixed(2)]);
  }
  const mid = at(((from + to) / 2) * total), quarter = [0.25, 0.75].map((q) => at((from + (to - from) * q) * total));
  const normal = [mid.tz * side, -mid.tx * side];
  return { points: [...inner, ...outer.slice().reverse()], inner, outer, centre: [mid.x + normal[0] * ((near + far) / 2), mid.z + normal[1] * ((near + far) / 2)], quarter, normal, near };
}

const LAWN_SPECS = [
  // [id, path, side, near, far, from, to]
  ['promenadeEast1', 'mainPromenade', 1, 4.5, 14, 0.29, 0.47],      // both sides of the entrance promenade, either side of the walk to the Central Administration
  ['promenadeEast2', 'mainPromenade', 1, 4.5, 14, 0.63, 0.88],
  ['promenadeWest', 'mainPromenade', -1, 4.5, 11, 0.2, 0.6],
  ['fountainNorth', 'plazaToFountain', 1, 4, 9, 0.185, 0.745],          // the two beds on the way to the fountain
  ['fountainSouth', 'plazaToFountain', -1, 4, 9, 0.185, 0.745],
];
const lawns = LAWN_SPECS.map(([id, pathId, side, near, far, from, to]) => ({ id, side, strip: pathStrip(pathId, side, near, far, from, to) }));

export const PATCHES = [
  ...lawns.map(({ id, strip }) => ({ id, points: strip.points, hedge: { inner: strip.inner, outer: strip.outer }, bed: { at: strip.centre, radius: 2.2 } })),
  { id: 'cafeLawn', shrubs: 2, flowers: 4, points: orientedRect(-60, 32, 12, 8, 149) },   // beside the Science Building, aligned with the Upper Gate road
];

// Benches at the curb between each lawn and its path, two to a lawn, facing the grass (angle: 0 faces south, then clockwise on the map).
HANGOUT_DECOR['MAIN-PLAZA'].benches = lawns.flatMap(({ side, strip }) =>
  strip.quarter.map(({ x, z, tx, tz }) => {
    const nx = tz * side, nz = -tx * side, d = strip.near - 0.7;
    return [+(x + nx * d).toFixed(2), +(z + nz * d).toFixed(2), +((Math.atan2(-nx, nz) * 180) / Math.PI).toFixed(1)];
  })
);

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
// Lots A, B, C, I and K are OSM outlines (B and C are cut where the OSM outline runs off the platform, onto the slope); D, E, F, G, H and J are read from the master plan (about 25 m accuracy).
// Lot H is on the master plan but not in the FM list, so it has no place.
export const PARKING = [
  {
    code: 'A', name: 'Lower Parking (RIGHT)', access: 'Students', placeId: 'BP-A',
    area: [[-413.6, -9.4], [-414.1, -4.8], [-403.5, 31.1], [-365.2, 50.2], [-306.3, 65.5], [-302.1, 41.4], [-306.1, 20.5], [-334.3, 12.3], [-360.2, 6.3], [-406.7, -12.5]],
    badge: [-360, 30],
  },
  {
    code: 'B', name: 'Lower Parking (LEFT)', access: 'Students', placeId: 'BP-B',
    area: [[-344.5, -9.6], [-327.2, -0.7], [-312.9, -23.3], [-315.1, -3.9], [-308.5, -3.2], [-309.2, 4.2], [-294.4, 3.2], [-276.1, -3.9], [-263.5, -16.2], [-248.6, -15.7], [-170.8, -15.4], [-156.2, -16.7], [-154.4, -23.8], [-160.1, -31.9], [-171, -31], [-197, -31], [-236, -31], [-266.7, -31], [-282.4, -31], [-297.8, -31], [-317.8, -31], [-327, -31]],
    badge: [-240, -24],
  },
  {
    code: 'C', name: 'Science Parking', access: 'Faculty/Staff/LAU Vehicles', placeId: 'BP-C',
    area: [[-58.3, 7.2], [-67.3, -11.3], [-66.1, -18.7], [-20, -41], [-9, -30], [-9, -21]], // the OSM outline runs on up the cliff under the main plaza; this stops at its foot
    badge: [-30, -22],
  },
  {
    code: 'D', name: 'Residence Hall B Outdoor Parking', access: 'Dorms Students', placeId: 'BP-D',
    area: orientedRect(-108, -38, 26, 12, -20),
    badge: [-108, -38],
  },
  {
    code: 'E', name: 'Residence Hall B Underground Parking', access: 'Faculty/Staff', placeId: 'BP-E',
    area: [[-100.9, -47.9], [-91.4, -30], [-35.7, -58.8], [-45.1, -76.8]],
    underground: true, badge: [-68, -53],
  },
  {
    code: 'F', name: 'Block A Underground Parking', access: 'Faculty/Staff', placeId: 'BP-F',
    area: [[-17.9, -93.6], [-4.1, -82.8], [28, -123.5], [14.2, -134.2]],
    underground: true, badge: [5, -109],
  },
  {
    code: 'G', name: 'Byblos Underground Parking', access: 'Students/Faculty/Staff', placeId: 'BP-G',
    area: orientedRect(35, -40, 56, 44, 0), // under the main plaza, five levels
    underground: true, badge: [35, -40],
  },
  {
    code: 'H', name: 'Parking H', access: '', placeId: null, // on the master plan only
    area: orientedRect(-204, 31, 22, 16, 0),
    badge: [-204, 31],
  },
  {
    code: 'I', name: 'Upper Gate Parking', access: 'Faculty/Staff', placeId: 'BP-I',
    area: [[-61.3, 48.8], [-61.6, 69.8], [-44.7, 71.3], [-19.8, 60.9], [-19.6, 53.2], [-14.3, 52.4], [-14.9, 41.7]],
    badge: [-40, 58],
  },
  {
    code: 'J', name: 'ELRC Parking (front)', access: 'Faculty/Staff', placeId: 'BP-J',
    area: orientedRect(42, 76, 26, 8, 20), // the maps put it beside Zakhem Hall; FM says "in front of the ELRC"
    badge: [42, 76],
  },
  {
    code: 'K', name: 'FCC Parking (back)', access: 'Faculty/Staff', placeId: 'BP-K',
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
