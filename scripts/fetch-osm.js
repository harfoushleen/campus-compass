// Downloads the streets (and, for Beirut, the neighbouring buildings) around an LAU campus from
// OpenStreetMap and saves them as src/campus/<campus>/osm-surroundings.json.
//
//   npm run osm                   Beirut
//   npm run osm -- byblos         Byblos
//   add --dry to only print what would be saved
//
// You only need to run this again if you want fresher OSM data.
// Data © OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright).
//
// LAU's own buildings are NOT taken from this file. They live in src/campus/<campus>/buildings.js
// (their outlines were copied from OSM once, then adjusted by hand).
//
//   Beirut  uses the Overpass API: every building and street in the area. Streets are drawn, and the
//           neighbouring buildings as plain blocks.
//   Byblos  uses OpenStreetMap's own map API (Overpass was too busy to rely on): only the roads near
//           the campus, cut off where they leave the scene. The village houses are left out on purpose.
import { writeFileSync } from 'node:fs';

const campus = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'beirut';
const dry = process.argv.includes('--dry');
const { ORIGIN, toLocal, toLatLng } = await import(`../src/campus/${campus}/geo.js`);

const CAMPUSES = {
  beirut: {
    // Area to download, in metres around the campus origin (x = east, z = south).
    area: { west: -260, east: 140, north: -190, south: 150 },
    // Buildings that are modelled by hand in buildings.js, so they're skipped here.
    skipIds: new Set([
      585168658, 585168662, 585168663, 585168664, 585168666, 585168667, 585168669, 585168670,
      987117564, 987117565, 987117566, 548377178, // ...LAU buildings and the Gezairi building
    ]),
    // Street widths in metres by OSM road type. Types not listed are left out.
    streetWidth: { primary: 12, secondary: 10, secondary_link: 7, tertiary: 9, residential: 8, unclassified: 7, service: 5, pedestrian: 5 },
  },
  byblos: {
    // The 3D scene's BOUNDS (src/campus/byblos/site.js).
    area: { west: -520, east: 420, north: -260, south: 220 },
    streetWidth: { secondary: 10, tertiary: 9, unclassified: 7, service: 5 },
    streetsNearCampus: 30, // metres from the campus boundary (the OSM "university" area)
    noBuildings: true,
  },
};
const config = CAMPUSES[campus];
if (!config) throw new Error(`Unknown campus "${campus}". Use: ${Object.keys(CAMPUSES).join(', ')}`);
const { area } = config;

const [south, west] = toLatLng(area.west, area.south);
const [north, east] = toLatLng(area.east, area.north);
const round = ([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10];

// ── Beirut: Overpass ──
async function fromOverpass() {
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:60];(way["building"](${bbox});way["highway"](${bbox}););out geom tags;`;
  // The public Overpass servers are sometimes busy, so try a few times on two servers.
  const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  async function download() {
    for (let attempt = 0; attempt < 6; attempt++) {
      const server = SERVERS[attempt % SERVERS.length];
      try {
        const res = await fetch(server, {
          method: 'POST',
          headers: { 'User-Agent': 'campus-compass (LAU student project)' },
          body: new URLSearchParams({ data: query }),
        });
        if (res.ok) return await res.json();
        console.warn(`${server} answered ${res.status}, retrying…`);
      } catch (err) {
        console.warn(`${server} failed (${err.message}), retrying…`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error('Could not reach an Overpass server. Try again in a few minutes.');
  }
  const { elements } = await download();

  const buildings = [];
  const streets = [];
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    const points = el.geometry.map((g) => round(toLocal(g.lat, g.lon)));
    const t = el.tags ?? {};

    if (t.building && !config.skipIds.has(el.id)) {
      const levels = parseInt(t['building:levels'], 10);
      buildings.push({ id: el.id, levels: Number.isFinite(levels) ? levels : null, points: points.slice(0, -1) });
    } else if (t.highway && config.streetWidth[t.highway]) {
      streets.push({ id: el.id, name: t['name:en'] || t.name || '', width: config.streetWidth[t.highway], points });
    }
  }
  return { buildings, streets };
}

// ── Byblos: OpenStreetMap map API (XML) ──
async function fromMapApi() {
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${west},${south},${east},${north}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'campus-compass (LAU student project)' } });
  if (!res.ok) throw new Error(`OpenStreetMap answered ${res.status} (the area is too big or the server is busy).`);
  const xml = await res.text();

  const attr = (s, k) => s.match(new RegExp(`\\b${k}="([^"]*)"`))?.[1];
  const nodes = new Map();
  for (const m of xml.matchAll(/<node ([^>]*?)\/?>/g)) nodes.set(attr(m[1], 'id'), round(toLocal(+attr(m[1], 'lat'), +attr(m[1], 'lon'))));
  const ways = [];
  for (const m of xml.matchAll(/<way ([^>]*?)>([\s\S]*?)<\/way>/g)) {
    const tags = Object.fromEntries([...m[2].matchAll(/<tag k="([^"]*)" v="([^"]*)"/g)].map((t) => [t[1], t[2]]));
    ways.push({ id: +attr(m[1], 'id'), tags, points: [...m[2].matchAll(/<nd ref="(\d+)"/g)].map((n) => nodes.get(n[1])).filter(Boolean) });
  }

  // Keep the roads that run through or just beside the campus (the OSM "university" area).
  const uni = ways.find((w) => w.tags.amenity === 'university')?.points ?? [];
  const inside = ([x, z]) => {
    let c = false;
    for (let i = 0, j = uni.length - 1; i < uni.length; j = i++) {
      const [xi, zi] = uni[i], [xj, zj] = uni[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  const distance = ([x, z]) => {
    let best = Infinity;
    for (let i = 0; i < uni.length; i++) {
      const [ax, az] = uni[i], [bx, bz] = uni[(i + 1) % uni.length];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
    }
    return best;
  };
  const inArea = ([x, z]) => x >= area.west && x <= area.east && z >= area.north && z <= area.south;

  const streets = [];
  for (const w of ways) {
    const width = config.streetWidth[w.tags.highway];
    const mid = w.points[Math.floor(w.points.length / 2)];
    if (!width || !mid || !(inside(mid) || distance(mid) < config.streetsNearCampus)) continue;
    // Cut the road where it leaves the scene.
    let run = [];
    const flush = () => {
      if (run.length > 1) streets.push({ id: w.id, name: w.tags['name:en'] || w.tags.name || '', width, points: run });
      run = [];
    };
    for (const p of w.points) (inArea(p) ? run.push(p) : flush());
    flush();
  }
  return { buildings: [], streets };
}

const { buildings, streets } = await (campus === 'byblos' ? fromMapApi() : fromOverpass());
const out = new URL(`../src/campus/${campus}/osm-surroundings.json`, import.meta.url);
if (dry) {
  console.log(`${campus}: would save ${buildings.length} buildings and ${streets.length} streets (origin ${ORIGIN.lat}, ${ORIGIN.lng})`);
} else {
  writeFileSync(out, JSON.stringify({ attribution: '© OpenStreetMap contributors (ODbL)', buildings, streets }));
  console.log(`Saved ${buildings.length} buildings and ${streets.length} streets to src/campus/${campus}/osm-surroundings.json`);
}
