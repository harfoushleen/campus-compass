// Downloads the streets and neighbouring buildings around the LAU Beirut campus
// from OpenStreetMap and saves them as src/campus/osm-surroundings.json.
//
// Run with: npm run osm
// You only need to run this again if you want fresher OSM data.
// Data © OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright).
//
// LAU's own buildings are NOT taken from this file. They live in src/campus/buildings.js
// (their outlines were copied from OSM once, then adjusted by hand).
import { writeFileSync } from 'node:fs';
import { ORIGIN, toLocal } from '../src/campus/geo.js';

// Area to download, in metres around the campus origin (x = east, z = south).
const AREA = { west: -260, east: 140, north: -190, south: 150 };

// Buildings that are modelled by hand in buildings.js, so they're skipped here.
const SKIP_IDS = new Set([
  585168658, 585168662, 585168663, 585168664, 585168666, 585168667, 585168669, 585168670,
  987117564, 987117565, 987117566, 548377178, // ...LAU buildings and the Gezairi building
]);

// Street widths in metres by OSM road type. Types not listed are left out.
const STREET_WIDTH = { primary: 12, secondary: 10, secondary_link: 7, tertiary: 9, residential: 8, unclassified: 7, service: 5, pedestrian: 5 };

const toLatLng = (x, z) => [
  ORIGIN.lat - z / 110574,
  ORIGIN.lng + x / (111320 * Math.cos((ORIGIN.lat * Math.PI) / 180)),
];
const [south, west] = toLatLng(AREA.west, AREA.south);
const [north, east] = toLatLng(AREA.east, AREA.north);
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

const round = ([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
const buildings = [];
const streets = [];

for (const el of elements) {
  if (el.type !== 'way' || !el.geometry) continue;
  const points = el.geometry.map((g) => round(toLocal(g.lat, g.lon)));
  const t = el.tags ?? {};

  if (t.building && !SKIP_IDS.has(el.id)) {
    const levels = parseInt(t['building:levels'], 10);
    buildings.push({ id: el.id, levels: Number.isFinite(levels) ? levels : null, points: points.slice(0, -1) });
  } else if (t.highway && STREET_WIDTH[t.highway]) {
    streets.push({ id: el.id, name: t['name:en'] || t.name || '', width: STREET_WIDTH[t.highway], points });
  }
}

const out = new URL('../src/campus/osm-surroundings.json', import.meta.url);
writeFileSync(out, JSON.stringify({ attribution: '© OpenStreetMap contributors (ODbL)', buildings, streets }));
console.log(`Saved ${buildings.length} buildings and ${streets.length} streets to src/campus/osm-surroundings.json`);
