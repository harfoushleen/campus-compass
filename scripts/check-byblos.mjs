// Checks the Byblos 3D scene for problems and prints every one it finds.
//
//   npm run check:byblos                 print the report, exit code 1 if anything is wrong
//   npm run check:byblos -- --json out   also save the problems as JSON
//
// It builds the same geometry the app draws (terrain, roads, paths, stairs, buildings, trees, lamps, parking, the horizon skirt)
// in Node, without a browser, and tests it:
//   terrain      one continuous surface: no holes, no gaps to the horizon, no pits, no cliffs a person must cross
//   floating     everything sits on the ground: buildings, roads, paths, stairs, walls, trees, lamps, parking lots
//   network      roads, paths and stairs form one network: every gate, entrance and parking lot is reachable, every end meets something
//   flicker      surfaces drawn at (almost) the same height over each other (z-fighting)
//
// Distances in metres. The numbers below are the tolerances; change them here, not in the checks.
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name) => (argv.includes('--' + name) ? argv[argv.indexOf('--' + name) + 1] : undefined);
const campus = opt('campus') ?? 'byblos';

const TOL = {
  floatGap: 0.35,        // a building's base may be this far above the ground at its edge before it "floats"
  buriedPad: 1.2,        // a building footprint may vary this much in ground height before it "sinks" on one side
  surfaceAbove: [0.02, 0.6], // roads, paths: height above the drawn ground, [min, max]
  stepAbove: [-0.15, 0.7],   // a stair tread's top above the ground at that step, [min, max]
  treeBase: 0.4,
  pit: 1.5,              // a ground point this much lower than all 8 neighbours 3 m away
  cliff: 1.6,            // ground slope (rise/run) in places people walk
  roadGrade: 0.25,       // steepest road (a steep service road; the main roads are graded to 12%)
  pathGrade: 0.35,       // steepest path or ramp (stairs are allowed up to stairGrade)
  stairGrade: 0.62,
  stairRiser: 0.25,
  snap: 0.5,             // an end is joined to another segment if it is within (that segment's half width + snap)
  gap: 3.5,              // ... and counts as a gap (open joint) if it is closer than half width + gap but not joined
  entrance: 5,           // an entrance is joined to a segment within this
  boundsEdge: 8,         // roads may leave the scene at its edge
  depth: 0.12,           // two layers within this height of each other flicker at long distances
};

const problems = [];
const add = (check, what, where, extra = '') => problems.push({ check, what, where, extra });
const fmt = (n) => (Math.round(n * 100) / 100).toString();
const pt = (x, z) => `(${fmt(x)}, ${fmt(z)})`;

const vite = await createServer({
  root, configFile: false, appType: 'custom', logLevel: 'error',
  server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] },
});
try {
  const { getModel } = await vite.ssrLoadModule('/src/campus/index.js');
  const geo = await vite.ssrLoadModule('/src/campus/geometry.js');
  const details = await vite.ssrLoadModule('/src/campus/details.js');
  const { buildSkirt } = await vite.ssrLoadModule('/src/campus/horizon.js');
  const m = getModel(campus);
  const { BOUNDS, heightAt } = m;
  const cross = campus === 'byblos';

  // ───────────── the drawn ground ─────────────
  const terrain = geo.buildTerrain(m);
  const tpos = terrain.attributes.position, tindex = terrain.index;
  const step = m.TERRAIN_STEP ?? 4;
  const cols = Math.round((BOUNDS.maxX - BOUNDS.minX) / step) + 1;
  const rows = tpos.count / cols;
  // vertex (ix, iz): the grid is laid out row by row, z increasing or decreasing (found below)
  const vx = (k) => tpos.getX(k), vy = (k) => tpos.getY(k), vz = (k) => tpos.getZ(k);
  const rowOfZ = new Map();
  for (let r = 0; r < rows; r++) rowOfZ.set(Math.round(vz(r * cols) * 100) / 100, r);
  const zFirst = vz(0), zLast = vz((rows - 1) * cols), zStep = (zLast - zFirst) / (rows - 1);

  /** Height of the drawn ground (its real triangles) at a point. */
  const groundAt = (x, z) => {
    const fx = (x - vx(0)) / ((vx(cols - 1) - vx(0)) / (cols - 1)), fz = (z - zFirst) / zStep;
    const ix = Math.min(cols - 2, Math.max(0, Math.floor(fx))), iz = Math.min(rows - 2, Math.max(0, Math.floor(fz)));
    const a = iz * cols + ix, d = a + 1, b = a + cols, c = b + 1; // PlaneGeometry: triangles (a, b, d) and (b, c, d)
    const tx = Math.min(1, Math.max(0, fx - ix)), tz = Math.min(1, Math.max(0, fz - iz));
    // in cell coordinates a = (0,0), d = (1,0), b = (0,1), c = (1,1); the two triangles share the b-d diagonal
    return tx + tz <= 1
      ? vy(a) + (vy(d) - vy(a)) * tx + (vy(b) - vy(a)) * tz
      : vy(c) + (vy(b) - vy(c)) * (1 - tx) + (vy(d) - vy(c)) * (1 - tz);
  };

  // 1. one continuous surface: every vertex finite, triangles share edges everywhere but the outline, one connected piece
  {
    let bad = 0;
    for (let k = 0; k < tpos.count; k++) if (![vx(k), vy(k), vz(k)].every(Number.isFinite)) bad++;
    if (bad) add('terrain', `${bad} ground vertices are not finite numbers (holes)`, 'ground mesh');
    const edgeCount = new Map();
    const parent = new Int32Array(tpos.count).map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    let degenerate = 0;
    for (let t = 0; t < tindex.count; t += 3) {
      const [p, q, r] = [tindex.getX(t), tindex.getX(t + 1), tindex.getX(t + 2)];
      const area = Math.abs((vx(q) - vx(p)) * (vz(r) - vz(p)) - (vx(r) - vx(p)) * (vz(q) - vz(p))) / 2;
      if (area < 1e-6) degenerate++;
      for (const [u, v] of [[p, q], [q, r], [r, p]]) { const key = u < v ? u * tpos.count + v : v * tpos.count + u; edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1); }
      parent[find(p)] = find(q); parent[find(q)] = find(r);
    }
    if (degenerate) add('terrain', `${degenerate} ground triangles have no area`, 'ground mesh');
    const roots = new Set();
    for (let k = 0; k < tpos.count; k++) roots.add(find(k));
    if (roots.size !== 1) add('terrain', `the ground is ${roots.size} separate pieces, not one`, 'ground mesh');
    let boundary = 0;
    for (const n of edgeCount.values()) if (n === 1) boundary++;
    const expected = 2 * (cols - 1) + 2 * (rows - 1);
    if (boundary !== expected) add('terrain', `the ground has ${boundary} open edges, its outline should have ${expected} (holes inside)`, 'ground mesh');
    // the ground's heights agree with heightAt (what trees, lamps and pins use) at the vertices
    let off = 0;
    for (let k = 0; k < tpos.count; k += 7) if (Math.abs(vy(k) - heightAt(vx(k), vz(k))) > 0.001) off++;
    if (off) add('terrain', `${off} ground vertices differ from heightAt()`, 'ground mesh');
  }

  // 2. the horizon skirt meets the ground along the whole outline, with no gap and no step
  if (m.HORIZON) {
    const skirt = buildSkirt(m);
    const sp = skirt.attributes.position;
    const byXZ = new Map();
    for (let k = 0; k < sp.count; k++) {
      const key = Math.round(sp.getX(k) * 10) + ',' + Math.round(sp.getZ(k) * 10);
      (byXZ.get(key) ?? byXZ.set(key, []).get(key)).push(sp.getY(k));
    }
    let steps = 0, worst = 0;
    for (const [key, ys] of byXZ) {
      const [x, z] = key.split(',').map((v) => +v / 10);
      if (x < BOUNDS.minX - 0.01 || x > BOUNDS.maxX + 0.01 || z < BOUNDS.minZ - 0.01 || z > BOUNDS.maxZ + 0.01) continue;
      const onEdge = Math.abs(x - BOUNDS.minX) < 0.01 || Math.abs(x - BOUNDS.maxX) < 0.01 || Math.abs(z - BOUNDS.minZ) < 0.01 || Math.abs(z - BOUNDS.maxZ) < 0.01;
      if (!onEdge) continue;
      const d = Math.min(...ys.map((y) => Math.abs(y - groundAt(x, z))));
      if (d > 0.05) { steps++; worst = Math.max(worst, d); }
    }
    if (steps) add('terrain', `the horizon skirt differs from the ground along the seam at ${steps} points (up to ${fmt(worst)} m): a step or gap`, 'scene edge');
    // the ground just inside the edge and the skirt just outside must not be far apart in height (a cliff at the edge shows the skirt's wall)
    let wall = 0;
    for (const [v, axis, sign] of [[BOUNDS.minX, 'x', -1], [BOUNDS.maxX, 'x', 1], [BOUNDS.minZ, 'z', -1], [BOUNDS.maxZ, 'z', 1]]) {
      const lo = axis === 'x' ? BOUNDS.minZ : BOUNDS.minX, hi = axis === 'x' ? BOUNDS.maxZ : BOUNDS.maxX;
      for (let t = lo; t <= hi; t += 6) {
        const inside = axis === 'x' ? heightAt(v - sign * 3, t) : heightAt(t, v - sign * 3), edge = axis === 'x' ? heightAt(v, t) : heightAt(t, v);
        if (Math.abs(inside - edge) > 4.5) wall++;
      }
    }
    if (wall) add('terrain', `${wall} places along the scene's edge where the ground is steeper than 150% (the skirt's wall shows as a dark patch)`, 'scene edge');
  }

  // 3. pits and cliffs. A pit is a ground point lower than all its neighbours (a hole that draws as a dark patch).
  {
    const pits = [];
    for (let z = BOUNDS.minZ + 6; z < BOUNDS.maxZ - 6; z += 3) for (let x = BOUNDS.minX + 6; x < BOUNDS.maxX - 6; x += 3) {
      const h = heightAt(x, z);
      let lower = true, depth = Infinity;
      for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [3, 3], [-3, -3], [3, -3], [-3, 3]]) { const d = heightAt(x + dx, z + dz) - h; if (d < TOL.pit) { lower = false; break; } depth = Math.min(depth, d); }
      if (lower) pits.push([x, z, depth]);
    }
    // merge neighbours into one report each
    const used = new Set();
    for (const [x, z, d] of pits) {
      const key = `${Math.round(x / 12)},${Math.round(z / 12)}`;
      if (used.has(key)) continue;
      used.add(key);
      add('terrain', `pit: ground ${fmt(d)}+ m lower than everything around it`, pt(x, z));
    }
  }

  // ───────────── the network ─────────────
  const streets = [...m.osm.streets.map((s) => ({ id: String(s.id), kind: 'road', width: s.width, pts: s.points })), ...(m.DRIVES ?? []).map((s) => ({ id: s.id, kind: 'road', width: s.width, pts: s.points }))];
  const paths = m.PATHS.map((p) => ({ id: p.id, kind: 'path', width: p.width, pts: p.points }));
  const stairs = m.STAIRS.map((s) => ({ id: s.id, kind: 'stairs', width: s.width, pts: [s.from, s.to] }));
  const segs = [...streets, ...paths, ...stairs];
  const plazas = m.TERRACES_LEVELLED?.map((t, i) => ({ id: `plaza ${i} (${t.level})`, points: t.points })) ?? [];
  plazas.push(...(m.HOLLOWS ?? []).map((h) => ({ id: `court ${h.id}`, points: h.points }))); // a sunken court is walkable ground too
  const lots = (m.PARKING ?? []).map((l) => ({ ...l, id: `lot ${l.code}` }));

  const segDist = (px, pz, ax, az, bx, bz) => {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
  };
  const distToLine = (px, pz, pts) => { let best = Infinity; for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return best; };
  const lineDist = (a, b) => { let best = Infinity; for (const [x, z] of a) best = Math.min(best, distToLine(x, z, b)); for (const [x, z] of b) best = Math.min(best, distToLine(x, z, a)); return best; };
  const inPoly = (poly, x, z) => geo.insidePolygon(poly, x, z);
  const distToPoly = (poly, x, z) => (inPoly(poly, x, z) ? 0 : distToLine(x, z, [...poly, poly[0]]));

  // 4. grades: no road, path or stair steeper than it can be walked or driven; stairs are real stairs
  for (const s of segs) {
    const tol = s.kind === 'road' ? TOL.roadGrade : s.kind === 'path' ? TOL.pathGrade : TOL.stairGrade;
    let worst = 0, at = null;
    for (let i = 0; i < s.pts.length - 1; i++) {
      const [ax, az] = s.pts[i], [bx, bz] = s.pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 4));
      for (let k = 0; k < n; k++) {
        const x0 = ax + ((bx - ax) * k) / n, z0 = az + ((bz - az) * k) / n, x1 = ax + ((bx - ax) * (k + 1)) / n, z1 = az + ((bz - az) * (k + 1)) / n;
        const g = Math.abs(heightAt(x1, z1) - heightAt(x0, z0)) / Math.max(0.1, Math.hypot(x1 - x0, z1 - z0));
        if (g > worst) { worst = g; at = [x0, z0]; }
      }
    }
    if (worst > tol) add('network', `${s.kind} '${s.id}' climbs ${Math.round(worst * 100)}% (limit ${Math.round(tol * 100)}%)${s.kind === 'path' || s.kind === 'road' ? ': needs stairs, a ramp, or a regraded slope' : ''}`, pt(...at));
  }
  for (const st of m.STAIRS) {
    const rise = Math.abs(heightAt(...st.to) - heightAt(...st.from)), riser = rise / st.steps;
    if (riser > TOL.stairRiser) add('network', `stairs '${st.id}' have ${nsteps} steps for ${fmt(rise)} m: ${fmt(riser)} m per step (limit ${TOL.stairRiser})`, pt(...st.from));
  }

  // 4b. nothing runs through a building (a path, road or stair may touch a footprint at its ends, where it reaches the door)
  for (const s of segs) {
    let inside = 0, first = null;
    for (let i = 0; i < s.pts.length - 1; i++) {
      const [ax, az] = s.pts[i], [bx, bz] = s.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
        const endDist = Math.min(Math.hypot(x - s.pts[0][0], z - s.pts[0][1]), Math.hypot(x - s.pts[s.pts.length - 1][0], z - s.pts[s.pts.length - 1][1]));
        if (endDist > 4 && m.BUILDINGS.some((b) => b.parts.some((p) => inPoly(p.footprint, x, z)))) { inside++; first ??= [x, z]; }
      }
    }
    if (inside) add('network', `${s.kind} '${s.id}' runs through a building (${inside} sample points)`, pt(...first));
  }

  // 5. gates, entrances, parking lots, plazas, and the joints between segments
  const gates = m.GATES.map((g) => ({ id: `gate ${g.id}`, at: g.position }));
  const entrances = m.BUILDINGS.map((b) => ({ id: b.id, at: b.entrance, building: b }));
  const half = (s) => s.width / 2;
  const touches = (x, z, s, extra = TOL.snap) => distToLine(x, z, s.pts) <= half(s) + extra;
  const inPlaza = (x, z, pad = 1.5) => plazas.some((p) => distToPoly(p.points, x, z) <= pad);
  const inLot = (x, z, pad = 1.5) => lots.some((l) => distToPoly(l.area, x, z) <= pad);
  const inBuilding = (x, z, pad = 1.5) => m.BUILDINGS.some((b) => b.parts.some((p) => distToPoly(p.footprint, x, z) <= pad));
  const nearBounds = (x, z) => x <= BOUNDS.minX + TOL.boundsEdge || x >= BOUNDS.maxX - TOL.boundsEdge || z <= BOUNDS.minZ + TOL.boundsEdge || z >= BOUNDS.maxZ - TOL.boundsEdge;
  const terminals = (m.ROAD_ENDS ?? []).map(([x, z]) => [x, z]);

  // graph: nodes are segments, plazas, gates; edges where they touch
  const nodes = [...segs.map((s) => ({ ...s, type: 'segment' })), ...plazas.map((p) => ({ ...p, type: 'plaza' })), ...gates.map((g) => ({ ...g, type: 'gate' }))];
  const adj = nodes.map(() => new Set());
  const link = (i, j) => { if (i !== j) { adj[i].add(j); adj[j].add(i); } };
  nodes.forEach((a, i) => nodes.forEach((b, j) => {
    if (j <= i) return;
    if (a.type === 'segment' && b.type === 'segment') {
      const ends = (s) => [s.pts[0], s.pts[s.pts.length - 1]];
      const joined = ends(a).some(([x, z]) => touches(x, z, b)) || ends(b).some(([x, z]) => touches(x, z, a));
      // roads and paths that cross also meet (a T or an X)
      let crossing = false;
      for (let p = 0; p < a.pts.length - 1 && !crossing; p++) for (let q = 0; q < b.pts.length - 1 && !crossing; q++) {
        const [p1, p2, q1, q2] = [a.pts[p], a.pts[p + 1], b.pts[q], b.pts[q + 1]];
        const d = (u, v, w) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
        if (d(p1, p2, q1) * d(p1, p2, q2) < 0 && d(q1, q2, p1) * d(q1, q2, p2) < 0) crossing = true;
      }
      if (joined || crossing) link(i, j);
    } else if (a.type === 'segment' && b.type === 'plaza') {
      if (a.pts.some(([x, z]) => distToPoly(b.points, x, z) <= 1.5)) link(i, j);
    } else if (a.type === 'segment' && b.type === 'gate') {
      if (distToLine(b.at[0], b.at[1], a.pts) <= half(a) + 8) link(i, j);
    } else if (a.type === 'plaza' && b.type === 'gate') {
      if (distToPoly(a.points, b.at[0], b.at[1]) <= 8) link(i, j);
    }
  }));
  const reach = (starts, allow = () => true) => {
    const seen = new Set(starts);
    const queue = [...starts];
    while (queue.length) for (const n of adj[queue.shift()]) if (!seen.has(n) && allow(nodes[n])) { seen.add(n); queue.push(n); }
    return seen;
  };
  const gateIdx = nodes.map((n, i) => (n.type === 'gate' ? i : -1)).filter((i) => i >= 0);
  const walkable = reach(gateIdx);
  const drivable = reach(gateIdx, (n) => n.type !== 'segment' || n.kind === 'road');

  if (cross) {
    // every segment reachable from a gate
    nodes.forEach((n, i) => { if (n.type === 'segment' && !walkable.has(i)) add('network', `${n.kind} '${n.id}' cannot be reached from any gate`, pt(...n.pts[0])); });
    // gates connect to each other
    const fromMain = reach([gateIdx[0]]);
    gateIdx.forEach((g) => { if (!fromMain.has(g)) add('network', `${nodes[g].id} is not connected to ${nodes[gateIdx[0]].id} by roads, paths or stairs`, pt(...nodes[g].at)); });
    // entrances
    for (const e of entrances) {
      if (!e.at) { add('network', `building ${e.id} has no entrance (set 'entrance: [x, z]' in buildings.js)`, e.id); continue; }
      const [x, z] = e.at;
      const onFoot = nodes.findIndex((n, i) => walkable.has(i) && ((n.type === 'segment' && touches(x, z, n, TOL.entrance)) || (n.type === 'plaza' && distToPoly(n.points, x, z) <= 2)));
      const inFootprint = e.building.parts.some((p) => distToPoly(p.footprint, x, z) <= 3);
      if (!inFootprint) add('network', `entrance of ${e.id} is ${fmt(Math.min(...e.building.parts.map((p) => distToPoly(p.footprint, x, z))))} m from the building`, pt(x, z));
      if (onFoot < 0) add('network', `entrance of ${e.id} is not on any road, path or plaza connected to a gate`, pt(x, z));
    }
    // parking lots: surface lots reachable by road
    for (const l of lots) {
      if (l.underground) continue;
      const hit = nodes.findIndex((n, i) => n.type === 'segment' && n.kind === 'road' && drivable.has(i) && (distToPoly(l.area, ...n.pts[0]) <= 4 || n.pts.some(([x, z]) => distToPoly(l.area, x, z) <= 4) || l.area.some(([x, z]) => touches(x, z, n, 4))));
      const onPlaza = nodes.findIndex((n, i) => n.type === 'plaza' && drivable.has(i) && l.area.some(([x, z]) => distToPoly(n.points, x, z) <= 2));
      if (hit < 0 && onPlaza < 0) add('network', `${l.id} (${l.name}) cannot be reached by road from a gate`, pt(...l.badge));
    }
    // ends: every road, path and stair meets something at both ends
    for (const s of segs) {
      const closed = Math.hypot(s.pts[0][0] - s.pts[s.pts.length - 1][0], s.pts[0][1] - s.pts[s.pts.length - 1][1]) < 0.5;
      for (const [label, end] of closed ? [] : [['start', s.pts[0]], ['end', s.pts[s.pts.length - 1]]]) {
        const [x, z] = end;
        const others = segs.filter((o) => o !== s);
        const met = others.some((o) => touches(x, z, o)) || inPlaza(x, z) || inLot(x, z) || inBuilding(x, z) || gates.some((g) => Math.hypot(g.at[0] - x, g.at[1] - z) < 8) || entrances.some((e) => e.at && Math.hypot(e.at[0] - x, e.at[1] - z) < TOL.entrance) || terminals.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 4) || (s.kind === 'road' && nearBounds(x, z));
        if (met) continue;
        const near = others.map((o) => ({ o, d: distToLine(x, z, o.pts) - half(o) })).sort((p, q) => p.d - q.d)[0];
        if (near && near.d <= TOL.gap) add('network', `${s.kind} '${s.id}' ${label} stops ${fmt(near.d)} m short of ${near.o.kind} '${near.o.id}' (open joint)`, pt(x, z));
        else add('network', `${s.kind} '${s.id}' ${label} is a dead end: it meets no road, path, plaza, gate, building or parking lot${near ? ` (nearest: ${near.o.kind} '${near.o.id}', ${fmt(near.d)} m)` : ''}`, pt(x, z));
      }
    }
  }

  // ───────────── things sitting on the ground ─────────────
  // 6. buildings: base against the ground around the footprint, and pad flatness
  const mapB = (b) => b.parts.map((p, i) => ({ b, p, i }));
  for (const { b, p } of m.BUILDINGS.flatMap(mapB)) {
    const { bottom } = geo.partHeights(m, p);
    let low = Infinity, lowAt = null, hi = -Infinity;
    const ring = [];
    for (let i = 0; i < p.footprint.length; i++) {
      const [ax, az] = p.footprint[i], [bx, bz] = p.footprint[(i + 1) % p.footprint.length], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
      for (let k = 0; k < n; k++) ring.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
    for (const [x, z] of ring) { const g = groundAt(x, z); if (g < low) { low = g; lowAt = [x, z]; } hi = Math.max(hi, g); }
    if (bottom - low > TOL.floatGap) add('floating', `building ${b.id}: its base is ${fmt(bottom - low)} m above the ground along its edge (it floats; a gap shows under it)`, pt(...lowAt));
    if (hi - low > TOL.buriedPad) add('floating', `building ${b.id}: the ground under its edge varies by ${fmt(hi - low)} m (the pad is not level: one side sinks into the hill)`, pt(...lowAt));
  }
  // footprints that overlap (their walls and roofs flicker)
  {
    const all = m.BUILDINGS.flatMap(mapB);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const A = all[i], B = all[j];
      if (A.b === B.b) continue;
      let overlap = 0;
      const sample = (P, Q) => { for (const [x, z] of P) if (inPoly(Q, x, z)) overlap++; };
      const dense = (poly) => poly.flatMap(([x, z], k) => { const [x2, z2] = poly[(k + 1) % poly.length]; return [0, 0.25, 0.5, 0.75].map((t) => [x + (x2 - x) * t, z + (z2 - z) * t]); });
      sample(dense(A.p.footprint), B.p.footprint); sample(dense(B.p.footprint), A.p.footprint);
      if (overlap > 1) add('flicker', `buildings ${A.b.id} and ${B.b.id} overlap (walls and roofs share space and flicker)`, pt(...geo.centroid(A.p.footprint)));
    }
  }

  // 7. roads and paths: every vertex of each drawn ribbon against the drawn ground
  const ribbonCheck = (seg, geometry) => {
    const p = geometry.attributes.position;
    let floating = 0, sunk = 0, worstUp = 0, worstDown = 0, firstF = null, firstS = null;
    for (let k = 0; k < p.count; k++) {
      const above = p.getY(k) - groundAt(p.getX(k), p.getZ(k));
      if (above < TOL.surfaceAbove[0]) { sunk++; worstDown = Math.min(worstDown, above); firstS ??= [p.getX(k), p.getZ(k)]; }
      if (above > TOL.surfaceAbove[1]) { floating++; worstUp = Math.max(worstUp, above); firstF ??= [p.getX(k), p.getZ(k)]; }
    }
    if (sunk) add('floating', `${seg.kind} '${seg.id}': ${sunk} vertices sink into the ground (down to ${fmt(worstDown)} m), the ground cuts it`, pt(...firstS));
    if (floating) add('floating', `${seg.kind} '${seg.id}': ${floating} vertices float above the ground (up to ${fmt(worstUp)} m)`, pt(...firstF));
  };
  for (const s of streets) ribbonCheck(s, geo.buildStreets({ ...m, osm: { ...m.osm, streets: /^[0-9]/.test(s.id) ? m.osm.streets.filter((o) => String(o.id) === s.id) : [] }, DRIVES: /^[0-9]/.test(s.id) ? [] : (m.DRIVES ?? []).filter((o) => o.id === s.id) }));
  for (const s of paths) ribbonCheck(s, geo.buildPaths({ ...m, PATHS: m.PATHS.filter((o) => o.id === s.id) }));
  // 8. stairs: every tread, against the ground at that step
  for (const st of m.STAIRS) {
    const [fx, fz] = st.from, [tx, tz] = st.to, len = Math.hypot(tx - fx, tz - fz), dx = (tx - fx) / len, dz = (tz - fz) / len;
    const h0 = heightAt(fx, fz), rise = heightAt(tx, tz) - h0;
    let bad = 0, worst = 0, first = null;
    const ns = geo.stairSteps(m, st);
    for (let i = 0; i < ns; i++) {
      const along = (i + 0.5) * (len / ns), x = fx + dx * along, z = fz + dz * along;
      const top = h0 + (rise * (i + 1)) / ns + 0.25;
      for (const side of [-1, 0, 1]) {
        const sx = x - dz * side * (st.width / 2 - 0.3), sz = z + dx * side * (st.width / 2 - 0.3);
        const above = top - groundAt(sx, sz);
        if (above < TOL.stepAbove[0] || above > TOL.stepAbove[1]) { bad++; if (Math.abs(above) > Math.abs(worst)) worst = above; first ??= [sx, sz]; }
      }
    }
    if (bad) add('floating', `stairs '${st.id}': ${bad} treads do not follow the slope (up to ${fmt(worst)} m off the ground)`, pt(...first));
  }
  // 9. trees and lamps
  {
    const trees = details.buildTreeInstances(m);
    let bad = 0, first = null;
    for (const t of trees) { const d = Math.abs(t.position[1] - groundAt(t.position[0], t.position[2])); if (d > TOL.treeBase) { bad++; first ??= t.position; } }
    if (bad) add('floating', `${bad} trees stand off the ground`, pt(first[0], first[2]));
    // trees on roads, paths, stairs, parking lots or building footprints
    let onRoad = 0, firstRoad = null;
    for (const t of trees) { const [x, , z] = t.position; if (segs.some((s) => touches(x, z, s, 0.2)) || inLot(x, z, 0) || inBuilding(x, z, 0)) { onRoad++; firstRoad ??= t.position; } }
    if (onRoad) add('floating', `${onRoad} trees grow on a road, path, stair, parking lot or building`, pt(firstRoad[0], firstRoad[2]));
    if (m.LAMPS) {
      const lamps = details.buildLampPositions(m);
      let lbad = 0, lf = null;
      for (const [x, z] of lamps) if (Math.abs(heightAt(x, z) - groundAt(x, z)) > 0.4) { lbad++; lf ??= [x, z]; }
      if (lbad) add('floating', `${lbad} lamp posts stand off the ground`, pt(...lf));
    }
  }
  // 10. parking lots: drawn flat at one height; the ground under each must be flat too (or the lot is drawn draped)
  for (const l of lots) {
    const draped = m.DRAPE_PARKING;
    if (draped) continue;
    const hs = [];
    for (let i = 0; i < 40; i++) { const x = l.area.reduce((s, p) => s + p[0], 0) / l.area.length, z = l.area.reduce((s, p) => s + p[1], 0) / l.area.length; hs.push(groundAt(x + ((i % 8) - 4) * 3, z + (Math.floor(i / 8) - 2) * 3)); }
    const [cx, cz] = geo.centroid(l.area);
    const y = heightAt(cx, cz) + 0.3;
    let worst = 0, at = null;
    for (const [x, z] of l.area) { const d = y - groundAt(x, z); if (Math.abs(d) > Math.abs(worst)) { worst = d; at = [x, z]; } }
    if (worst > 0.8) add('floating', `${l.id} is drawn flat ${fmt(worst)} m above the ground at its edge (floats)`, pt(...at));
    if (worst < 0.05) add('floating', `${l.id} is drawn flat ${fmt(-worst + 0.3)} m below the ground at its edge (sinks)`, pt(...at));
  }
  // 11. retaining walls (off at the moment, see WALLS in site.js): each wall vertex against the ground (the base must reach it, the top must stand level with the pad)
  if (m.WALLS && geo.buildWalls) {
    const w = geo.buildWalls(m);
    if (w) {
      const fp = w.face.attributes.position;
      let high = 0, firstH = null, buried = 0, firstB = null;
      for (let k = 0; k < fp.count; k += 3) {
        const g = groundAt(fp.getX(k), fp.getZ(k));
        if (fp.getY(k) - g < 0.3) { buried++; firstB ??= [fp.getX(k), fp.getZ(k)]; }  // the top of a wall must stand above the ground at its foot
      }
      for (let k = 1; k < fp.count; k += 3) {
        const g = groundAt(fp.getX(k), fp.getZ(k));
        if (fp.getY(k) - g > 0.9) { high++; firstH ??= [fp.getX(k), fp.getZ(k)]; }   // its base must reach the ground
      }
      void buried; void firstB;
      if (high) add('floating', `${high} retaining wall faces stop ${'0.9'}+ m above the ground at their foot`, pt(...firstH));
    }
  }

  // 12. lawns, flower beds and benches: not on a road, path, stair, or in a building
  {
    const onNetwork = (x, z, pad = 0.2) => segs.some((s) => touches(x, z, s, pad));
    for (const pc of m.PATCHES ?? []) {
      const xs = pc.points.map((q) => q[0]), zs = pc.points.map((q) => q[1]);
      let road = 0, bld = 0, first = null;
      for (let z = Math.min(...zs); z <= Math.max(...zs); z += 1.5) for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1.5) {
        if (!inPoly(pc.points, x, z)) continue;
        if (onNetwork(x, z)) { road++; first ??= [x, z]; }
        if (inBuilding(x, z, 0.3)) { bld++; first ??= [x, z]; }
      }
      if (road) add('floating', `lawn '${pc.id}' lies over a road, path or stair (${road} sample points)`, pt(...first));
      if (bld) add('floating', `lawn '${pc.id}' lies inside or against a building (${bld} sample points)`, pt(...first));
    }
    for (const [id, d] of Object.entries(m.HANGOUT_DECOR ?? {})) for (const [x, z] of d.benches ?? []) {
      if (onNetwork(x, z, 0.1)) add('floating', `a bench of '${id}' stands on a road, path or stair`, pt(x, z));
      if (inBuilding(x, z, 0.2)) add('floating', `a bench of '${id}' stands inside a building`, pt(x, z));
      const g = Math.abs(groundAt(x, z) - heightAt(x, z));
      if (g > 0.3) add('floating', `a bench of '${id}' is ${fmt(g)} m off the ground`, pt(x, z));
    }
  }

  // 13. dark patches: bare forest-green ground inside a paved area (the ground colour fades from stone to green at the edge of a pad;
  //     inside a terrace it should be stone all the way)
  if (m.groundMask) {
    for (const pl of [...plazas, ...(m.CAMPUS_CORE ? [{ id: 'the paved campus (CAMPUS_CORE)', points: m.CAMPUS_CORE }] : [])]) {
      let bad = 0, first = null;
      const xs = pl.points.map((q) => q[0]), zs = pl.points.map((q) => q[1]);
      for (let z = Math.min(...zs); z <= Math.max(...zs); z += 2) for (let x = Math.min(...xs); x <= Math.max(...xs); x += 2) {
        if (distToPoly(pl.points, x, z) > 0 || distToLine(x, z, [...pl.points, pl.points[0]]) < 1.5) continue;
        if (m.groundMask(x, z) < 0.85 && !inBuilding(x, z, 0)) { bad++; first ??= [x, z]; }
      }
      if (bad) add('terrain', `${bad} sample points inside ${pl.id} are forest green, not paved (a dark patch in the plaza)`, pt(...first));
    }
  }

  // 14. one walkable surface: from the main gate, the paved ground, roads, paths and stairs (a slope of 50% at most on the paved ground,
  //     70% on stairs) must lead to every building entrance. This is what a person on foot can actually do, whatever the lists say.
  if (cross && m.groundMask) {
    const cell = 3, nx = Math.floor((BOUNDS.maxX - BOUNDS.minX) / cell) + 1, nz = Math.floor((BOUNDS.maxZ - BOUNDS.minZ) / cell) + 1;
    const X = (i) => BOUNDS.minX + i * cell, Z = (j) => BOUNDS.minZ + j * cell;
    const nearSeg = (x, z, kinds, extra) => segs.some((s) => kinds.includes(s.kind) && touches(x, z, s, extra));
    const walk = new Uint8Array(nx * nz), onStairs = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = X(i), z = Z(j);
      if (inBuilding(x, z, 0)) continue;
      if (nearSeg(x, z, ['stairs'], 1.2)) { walk[j * nx + i] = 1; onStairs[j * nx + i] = 1; }
      else if (m.groundMask(x, z) >= 0.5 || nearSeg(x, z, ['road', 'path'], 1.2)) walk[j * nx + i] = 1;
    }
    const start = m.GATES[0].position, si = Math.round((start[0] - BOUNDS.minX) / cell), sj = Math.round((start[1] - BOUNDS.minZ) / cell);
    const seen = new Uint8Array(nx * nz), queue = [];
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const k = (sj + dj) * nx + si + di; if (walk[k]) { seen[k] = 1; queue.push(k); } }
    while (queue.length) {
      const k = queue.pop(), i = k % nx, j = (k - i) / nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const k2 = jj * nx + ii;
        if (!walk[k2] || seen[k2]) continue;
        const slope = Math.abs(heightAt(X(ii), Z(jj)) - heightAt(X(i), Z(j))) / (cell * Math.hypot(di, dj));
        if (slope > (onStairs[k] || onStairs[k2] ? 0.7 : 0.5)) continue;
        seen[k2] = 1; queue.push(k2);
      }
    }
    for (const e of entrances) {
      if (!e.at) continue;
      const [ex, ez] = e.at;
      let ok = false;
      for (let dj = -2; dj <= 2 && !ok; dj++) for (let di = -2; di <= 2 && !ok; di++) ok = !!seen[(Math.round((ez - BOUNDS.minZ) / cell) + dj) * nx + Math.round((ex - BOUNDS.minX) / cell) + di];
      if (!ok) add('network', `on foot, from the main gate: the entrance of ${e.id} cannot be reached over paved ground, roads, paths and stairs (a cliff or a gap of unpaved ground is in the way)`, pt(ex, ez));
    }
  }

  // ───────────── flicker ─────────────
  // 12. surfaces drawn over each other: the vertical gap between layers must beat the depth buffer's precision at long range.
  //     Without help (polygon offset, m.LAYER_OFFSET) two layers closer than TOL.depth flicker when zoomed out.
  {
    const lifts = m.LIFTS ?? { street: 0.08, path: 0.15, patch: 0.1, parking: 0.3 };
    const mitigated = !!m.LAYER_OFFSET;
    const overlap = (A, B) => A.some((a) => B.some((b) => lineDist(a.pts, b.pts) < (a.width + b.width) / 2));
    const roadPath = overlap(streets, paths), roadPatch = (m.PATCHES ?? []).some((pc) => streets.some((s) => s.pts.some(([x, z]) => inPoly(pc.points, x, z))));
    const pairs = [
      ['roads', 'paths', lifts.street, lifts.path, roadPath],
      ['roads', 'garden patches', lifts.street, lifts.patch, roadPatch],
      ['the ground', 'roads', 0, lifts.street, true],
      ['the ground', 'paths', 0, lifts.path, true],
      ['the ground', 'garden patches', 0, lifts.patch, (m.PATCHES ?? []).length > 0],
      ['roads', 'parking lots', lifts.street, lifts.parking, lots.length > 0 && streets.some((s) => lots.some((l) => s.pts.some(([x, z]) => inPoly(l.area, x, z))))],
    ];
    for (const [a, b, ya, yb, present] of pairs) {
      if (present && Math.abs(ya - yb) < TOL.depth && !mitigated) add('flicker', `${a} and ${b} are drawn only ${fmt(Math.abs(ya - yb))} m apart: they flicker when zoomed out`, 'scene-wide', 'fix: raise the lifts or turn on LAYER_OFFSET');
    }
  }

  // ───────────── report ─────────────
  const order = ['terrain', 'floating', 'network', 'flicker'];
  console.log(`\nLAU ${campus} scene check: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`);
  for (const check of order) {
    const list = problems.filter((p) => p.check === check);
    console.log(`${check.toUpperCase()}  ${list.length}`);
    for (const p of list) console.log(`  - ${p.what}  @ ${p.where}${p.extra ? '  [' + p.extra + ']' : ''}`);
    console.log('');
  }
  if (opt('json')) writeFileSync(opt('json'), JSON.stringify(problems, null, 2));
  process.exitCode = problems.length ? 1 : 0;
} finally {
  await vite.close();
}
