# LAU Byblos: quality audit

Nothing here is committed. Run the check yourself: `npm run check:byblos` (add `-- --json out.json` to save the list).
The photos used as reference are in [byblos-references.md](byblos-references.md). Raw results: `docs/check/byblos-check-before.json`,
`byblos-check-after.json`, `byblos-check-after.txt`. All screenshots are in `docs/screenshots/byblos-audit-*.png`.

## Result

| | Before | After |
|---|---|---|
| Problems the script reports | **103** (63 network, 36 floating or sunken, 4 flicker) | **38** (12 network, 26 floating or sunken, 0 terrain, 0 flicker) |
| Beirut's default view, light and dark | | pixel-identical to before (0 of 980,000 pixels differ) |
| `npm run package` | | builds and passes its offline check |

I did **not** get to zero. What is left, and why, is listed at the end. Everything else the check found was fixed.

> **A correction.** My first "after" run said 36 problems; one check (the road ribbons against the ground) had a typo in a pattern and silently skipped every OpenStreetMap road. With the typo fixed it found 30 more (roads sunk into steep ground, up to 11 m at the Engineering center). I fixed those by laying each corner of a road or path ribbon on the ground under it (`RIBBON_ON_GROUND`), which brings the total to 38; the 14 or so ribbon problems left are 0.1 to 1.5 m, where a road crosses a pad edge or a cliff.

## What the script checks (`scripts/check-byblos.mjs`)

It builds the same geometry as the app (ground, roads, paths, stairs, buildings, trees, lamps, parking lots, the horizon skirt) in Node and tests:

- **Terrain**: one continuous surface (every vertex finite, no open edges inside, one connected piece), the skirt beyond the edge meeting the ground with no step, no pits (ground lower than everything round it), no forest-green ground inside a paved area (the dark patches).
- **Floating and sunken**: each building's base against the ground along its edge and how level its pad is; every vertex of every road and path ribbon against the drawn ground; every stair tread; trees, lamps, benches, lawns; parking lots.
- **Network**: grades (roads 25%, paths 35%, stairs 62%, 0.25 m per step); nothing runs through a building; every road, path and stair end meets another one, a plaza, a gate, a building, a lot or the edge of the model; every building has an `entrance` that a road, path or plaza reaches; every surface parking lot is reachable by road from a gate; and a walk over the paved ground, roads, paths and stairs from the main gate must reach every entrance.
- **Flicker**: surfaces layered less than 0.12 m apart (and whether the polygon-offset safeguard is on).
- **Lawns and benches**: not over a road, path, stair or building.

## Problems found and what I did

| Problem (before) | Fix |
|---|---|
| Residence C stranded on its own 36 m pillar, nothing reached it | A graded road from the Lower Parking A platform (36 m) to its door, on a causeway; entrance added |
| Water Tank 50 m, Infrastructure Plants 32 m, Zakhem Hall: no road or path | Drives and a service road (T9 and T10 platforms lowered/raised 6 m and +10 m to make them reachable), a path to Zakhem's door |
| 21 buildings had no entrance in the data | Every building has an `entrance: [x, z]` (buildings.js) |
| 16 roads climbed 30% to 200% (cliffs between terraces) | Every road is graded to 12% and pinned to the terrace levels it crosses; stairs where a road cannot go (Lower Gate to the plaza, the east promenade, the Engineering center, Architecture Hall to the Upper Gate road) |
| Roads and paths cut by the ground, jagged edges | Level ground across every road and path; the ground mesh now has a vertex every 3 m (the height grid's step) |
| Stairs: heights off by up to 16 m, 0.7 m steps | Stairs cut through the pads they cross; the number of steps follows the climb (0.17 m each) |
| 6 parking lots drawn flat 1 to 37 m above or below the slope; the lots ran up cliffs as black shards | Surface lots are laid over the slope, pieces on a slope steeper than about 35% are left out; underground lots stay level; lot B and C outlines cut where the OSM outline ran off the platform |
| Surfaces within 0.02 to 0.1 m of each other flicker | Layers at 0.14, 0.28 and 0.42 m, and polygon offset on roads, paths, lawns, lots |
| Building bases hovering over slopes | Bases reach the lowest ground round the footprint |
| Lawns overlapping roads and the Student Center, benches in the road | Lawns are strips that follow the paths, with a hedge, a round flower bed, benches at the curb facing the grass (as in the entrance photo) |
| Dark green patches inside the campus | The paved campus (`CAMPUS_CORE`) is one stone-coloured surface joining all the buildings |
| Random grey blocks round the buildings | These were retaining walls I generated along every pad edge; **removed** (the code is still there, turned off) |
| Roofs differing from the photos | Library: flat, green roof, pale screen (was a pink vault); Architecture Hall: flat, limestone (was orange hips); Health Clinic: flat louvred box (was a cream house with a hip roof); Residence C: flat; Service Center: white walls; Block A, Residence B, Frem, Bassil: lighter limestone |
| Camera under the terrain | Done in the previous round (`cameraGuard.js`): target on the ground, camera 6 m above it, during flights too |

## Hangouts added

New hangout places for Byblos (all `verified: false`, with the source in each place's note): **Library Amphitheater** (see the next section), **Under the Science Bridge** (a Byblos student blog: people sing and play guitar there; its exact spot is a guess), **Chagoury Garden**, **Frem Civic Center Garden**, **Zakhem Hall Steps** and **Block A Round Plaza** (from the FM photos and the master plan). I searched for Instagram and other posts naming Byblos hangout spots and found none the search tool could return (it does not return social media posts); the only student-written source was the blog above.

## Library amphitheater, and the two fountains

**Where it is.** Between the Joseph G. Jabbra Library and the Riyad Nassar Central Administration, against the excavated rock. The architects (Atelier Pagnamenta Torriani: "both the library and the administration buildings are placed adjacent to the excavated rock, forming an open amphitheater"; the sea breeze reaches "the outdoor amphitheater and café areas"; a concrete wall with the four alphabets stands above it) and LAU FM's own presentation ("the resulting interstitial space forms a sunken amphitheater") agree; none of the pages I could read describes a physical bridge (Domus calls the carved wall a symbolic bridge between past and future), so I did not build one; the D5 Magazine photo is titled "Library Bridge", and if you mean a real footbridge, tell me where. This replaces my earlier "Library Garden" on the Library's west side, which was a wrong guess (its terrace, path, stairs and olive tree are removed).

**What was built** (`byblos/site.js`): a sunken floor `HOLLOWS` (level TA, 57.5 m, 5.5 m below the plaza) in the gap between the two buildings, whose walls now stand on it; a 5.5 m wide flight of 32 steps (`amphitheaterSteps`) coming down from the plaza along the Library's face, reached by the path `amphitheaterWalk` from the Library entrance; a café court on the floor with a counter against the Central Administration, four round tables with chairs and two benches (new `tables` in `HANGOUT_DECOR`, drawn in `details.js`); the floor is paved and open to the slope on the north side. The `check:byblos` script now counts a sunken court as walkable ground. Screenshots: `byblos-amphitheater-desktop|phone-light|dark.png`.

**Fountains.** Zakhem Hall's fountain (the OSM one at [44, 11], radius 2) is now radius 4.5, moved to [42, 17] so its basin clears the path, with new benches; its place is renamed Zakhem Hall Fountain. The big fountain on the round plaza east of Bassil Hall is removed: it is now a plain round lawn, and its place is renamed Round Plaza (it was Fountain Plaza). Screenshots: `byblos-fountains-plaza-light.png`, `byblos-fountains-zakhem-light|dark.png`.

## Screenshots

- 11 angles, including low ones close to the ground (5, 6, 10): `byblos-audit-angle1-light.png` to `angle11-light.png`
- Desktop and phone, light and dark: `byblos-audit-desktop-light|dark.png`, `byblos-audit-phone-light|dark.png`, `byblos-audit-plaza-light|dark.png`
- Before (the committed version) and after at the same camera: `byblos-audit-before-a3|a4|a8|a11.png` against `angle3|4|8|11-light.png`
- Photos beside the model: `byblos-audit-photo-compare-1.png` (Library, Block A, Residence B, Chagoury) and `-2.png` (Science, Service Center, Frem, Architecture). My cameras are computed from each building's longest facade, so the angles only roughly match the photos.

## What is left, and why (38 problems)

**Network (12)**
- Roads `777277639`, `777277640`, `992652062`, `249222125` (ring road at the Animal Facility): the Chagoury and Frem terrace (67 m) is 5 to 16 m above the ring road beside it, with 10 to 50 m between them. They cannot be made a road without moving a terrace, and the terraces were tuned to the reference image.
- Roads `992652066`, `067`, `068`, `069` (aisles of the lower parking lots), `708713250` (the last 15 m of the road past Block A), `infrastructureDrive`: 25% to 70% for a few metres where a lot or a pad meets the road.
- Path `upperRoad` and stairs `scienceUp`: the terraces are too close for the climb (Science Parking to the main plaza is 24 m in 21 m: 100%, a ladder, not stairs). Needs a zigzag flight or a lift; the plaza edge would have to move.

**Floating and sunken (24)**
- 7 buildings stand on pads that vary 1.7 to 11 m across the footprint (Science Building 11 m and Student Center 6 m: their footprints touch two terraces; Residence C 4.7 m, Library 3.2 m: at a cliff; the Central Administration 5.5 m: by design, its south-west wall stands in the sunken amphitheater). The base now reaches the low side, so nothing hovers, but the high side is buried.
- Paths and drives with a few vertices 0.1 to 3 m off the ground where they cross a pad edge (about 14 of them; the worst is `upperRoad` where it crosses the gap between the Science Building and Tohme-Rizk Hall).
- Stairs `scienceUp`: 12 treads 0.6 m off.

**Not done**
- Roofs: the real Block A and Residence B have an orange-tile band with dormers along the eaves; the model has the white flat roof with orange boxes of the 3D map. The Cafeteria is kept with the navy curved roof from the 3D map although the photo shows a flat roof. The Library's perforated screen and the angular Central Administration are approximated by flat boxes.
- Retaining walls: tried and removed (see above). Where levels change sharply there is still a steep slope, not a wall.
- Residence B's underground parking (E) entrance, the Water Tank and Infrastructure Plants roofs and facades (no photos).

## Guesses in this round

Every entrance position (about 10 m); the Residence C road and platform; the Water Tank, Infrastructure and Zakhem links; T9 lowered from 84 to 78 m and T10 raised from 30 to 40 m; the lawn and bed layout (from one photo and the aerial); the roof changes (from the FM photos); which OSM roads were left out (the village roads and a bend north of the Chagoury center).
