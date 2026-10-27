# LAU Byblos campus: 3D layout plan

> **Update (stage 2): the block model is built.** The plan below (stage 1) was approved; this box lists what
> changed when it was built. Where a number below disagrees with this box, this box is right.
>
> **Your answers to the stage 1 questions**
>
> 1. **Camera**: the default view follows the reference image. The sea and the old town are drawn beyond the
>    campus's west edge and appear when you orbit that way. A **Sea view** button (next to "Default view") flies to
>    a camera on the campus's west side that looks west-north-west over Residence C, the old town and the sea.
> 2. **Terrain**: overall slope from free **NASA SRTM 30 m** elevation (via OpenTopoData, `src/campus/byblos/dem.json`),
>    then terraces tuned against the reference image. Final heights are in the table below.
> 3. **Village houses**: left out. `osm-surroundings.json` holds only the roads.
> 4. **Lot H**: drawn (no place).
> 5. **Shelters**: skipped. There is no Shelters category for Byblos, and no shelter is drawn. Not added until you have
>    confirmed them with LAU.
>
> **FM versus the maps**: where they disagree on a position, the maps win (Lot J is beside Zakhem Hall, as on the maps,
> not "in front of the ELRC"). Floor counts follow the FM floor lists, which agree with the images and the OSM footprints
> to within a floor or two; the mismatches are flagged as guesses 3, 4 and 18 in the list at the end.
>
> **Terrace heights, for checking on site.** `y` = metres above Lower Parking A (the datum, about **215 m above sea level**),
> so the absolute height is `215 + y`. "SRTM there" is the smoothed SRTM value at that spot, which is a *surface* model
> (roofs and trees add a few metres, so it reads high in built-up places). **These are estimates, not surveyed levels.**
>
> | Level | y (m) | About (m above sea) | SRTM there | What sits on it |
> |---|---|---|---|---|
> | T0 | 0 | 215 | 0 | Lower Parking A, Health Clinic (Gate House), Residence C |
> | T1 (ramp) | 3 to 35 | 218 to 250 | 3 to 25 | The lower road along Lower Parking B: 3 m at the west end (x −335), 15 m at x −250, 26 m at x −165, 35 m at the Lower Gate road |
> | T2 | 35 | 250 | 40 | Lower Gate, Residence Hall B (ground = Lower Gate road), lots D and E |
> | T3 | 39 | 254 | 44 | Science Parking C, Science Building |
> | T4 | 63 | 278 | 54 | Main Gate, main plaza, Library and Central Administration (lobby), Block A, Student Center, Service Center, lot F and G |
> | T5 | 62 | 277 | 57 | Fountain plaza, Zakhem, Architecture and Bassil halls |
> | T6 | 50 | 265 | 49 | Upper Gate road: Cafeteria, courts, Tohme-Rizk Hall, lot I, Upper Gate |
> | T7 | 67 | 282 | 63 to 70 | Chagoury Health Sciences Center, Frem Civic Center, lots J and K |
> | T8 | 76 | 291 | 90 | Engineering center (ELRC) |
> | T9 | 84 | 299 | 83 | Animal Facility, Water Tank |
> | T10 | 30 | 245 | 30 | Infrastructure Plants |
>
> The T4 (main plaza) and T8 (Engineering) levels are the two that differ most from SRTM (+9 m and −14 m). T4 was raised
> to match the Block A and Library roofs in the reference image; T8 was lowered for the same reason. Please check those
> two first. The steep drop north of Block A and Residence B (36 m over 80 m, from z = −60 to −140) is drawn from the
> reference image, not from the elevation data, which doesn't resolve it.
>
> **How the ground is built** (`src/campus/byblos/site.js`): (1) the SRTM grid, blurred to remove roofs; (2) the northern
> drop; (3) a ramp along the lower road; (4) every building's footprint and the open areas flattened to their level, each
> melting into the slope over 6 to 12 m. The result is baked once into a 3 m height grid (about 80 ms on a laptop), so
> `heightAt` stays fast for pins and (in stage 3) trees and lamps. Retaining walls and stairs between levels come in stage 3.
> Terrace colour fades from forest green to stone around the flattened areas.
>
> **Default camera** (fitted to 20 landmarks picked in the reference image, then adjusted by eye): position
> (−283, 242, −283), looking at (−175, 45, 58), vertical field of view 35°, i.e. looking south-south-east (about 18° from
> south toward east) and 29° down. The fit is within about 25 px (of 1700) on the campus core. The strip of lower parking
> in the far right of the reference is drawn lower and shorter than in the image: the reference stretches it. On phones the
> view is centred on the buildings (Library to Cafeteria) and the strip is a drag away.
>
> **Scene bounds** are x −520 to 420, z −260 to 220 (the plan said −470…400 and −170…200): wider so the forest fills the
> foreground. Beyond them the ground carries on and falls away; to the west it runs down to the sea at x ≈ −2,250.
>
> **Built in stage 2** (blocks only): all 21 buildings as blocks with windows (Beirut's window system), flat roofs, three gates,
> parking lots A to K (outlines; the underground E, F, G appear when Parking is open), roads from OSM, terrain, sea,
> old-town cluster, off-screen markers for Residence C and the Animal Facility, Sea view. Not yet (stage 3): roof shapes,
> facades and extras, paths, stairs, retaining walls, plazas, lawns, trees, courts, fountain, amphitheater, lamps, sky and
> horizon detail, night lights beyond lit windows. Stage 4: places.
>
> **Shared code**: Beirut's data moved unchanged to `src/campus/beirut/`; both campuses go through the same code
> (`src/campus/index.js`, `common.js`). Beirut's default view, in light and dark and on a phone, is pixel-identical to
> before (the only difference is the switcher, where Byblos no longer says "Coming soon").
>
> **Screenshots** (`docs/screenshots/`): `byblos-stage2-compare.png` (reference above, model below),
> `byblos-stage2-overlay.png` (the two overlaid 50/50), `byblos-stage2-desktop-light.png`, `-desktop-dark.png`,
> `-phone-light.png`, `-phone-dark.png`, `byblos-stage2-sea-view.png`.

## Stage 1 plan (approved)

Stage 1 of the Byblos 3D campus: the measurements the scene will be built from. **Nothing is built yet.**
Numbers come from three kinds of source, in this order of trust:

1. **OpenStreetMap (OSM)** building outlines, parking polygons and roads (downloaded 2026-10-27). Real metres.
2. **LAU Facilities Management (FM) site**: official building codes, floor counts, areas, parking letters and capacities.
3. **The three attached maps** (3D buildings, 3D parking, master plan): used for what OSM doesn't have
   (gates, courts, plazas, roofs, colours). The master plan is a flat plan, so it also fixes positions.

Everything that is a guess is marked **(guess)** here and collected in section 13. Stage 2 will correct positions and
proportions by putting screenshots next to the reference image, as for Beirut.

> **Heads-up: OSM is thin on this campus.** It has outlines for 11 of the 19 buildings that can be matched by name and position (4 more are matched by size only) and 5 parking lots, and the
> service roads. It has **no** footpaths, steps, gardens, grass, trees, courts or pitches inside LAU Byblos
> (the only `leisure` object nearby is a private swimming pool 500 m west of the campus, not LAU's).
> So paths, stairs, lawns, trees and courts are **traced from the attached images**, not from OSM.

## 1. What's on the FM site (official codes)

19 Byblos buildings. Codes are the official FM codes; the number is the FM building ID. Floors are the highest level in
the FM "Directory of Functions per Level". Area is FM's total floor area.

| Code | Building | FM ID | Floors (FM) | Total area | Built |
|---|---|---|---|---|---|
| **SCI** | Science Building | 02.201 | 7 (levels 1, 3–7) | 5,365 m² | 1991 |
| **TR** | Tohme-Rizk Hall | 02.202 | 4 | 948 m² | 1991 |
| **ARC** | Architecture Hall | 02.203 | 6 | 2,882 m² | 1996 |
| **ZH** | Zakhem Hall | 02.204 | 7 | 4,419 m² | 1996 |
| **BSL** | Semaan Melkan Bassil Hall | 02.205 | 5 (page says "four-story", lists 5 levels) | 1,214 m² | 1996 |
| **FCC** | Frem Civic Center | 02.206 | 5 | 5,171 m² | 2010 |
| **CHSC** | Gilbert and Rose-Marie Chagoury Health Sciences Center | 02.207 | 6 | 15,625 m² | 2013 |
| **UGP** | Byblos Underground Parking | 02.210 | 5 underground levels (1B–5B) | 18,950 m² | 2014 |
| **SC** | Service Center | 02.211 | 3 | 478 m² | 2001 |
| **LIB** | Joseph G. Jabbra Library | 02.212 | 5 (lobby on level 3) | 6,540 m² | 2018 |
| **RNCA** | Riyad Nassar Central Administration | 02.213 | 5 (lobby on level 3) | 1,944 m² | 2019 |
| **ELRC** | Engineering Laboratories and Research Center | 02.215 | 7 | 9,705 m² | 2017 |
| **BA** | Block A Building | 02.230 | 9 (functions on 3–9; 1–2 are parking F) | 8,595 m² | 1998 |
| **RHB** | Residence Hall Block B | 02.231 | 9 (1 store, 2–3 parking, 4–9 dorm) | 11,424 m² | 1998 |
| **CAF** | Cafeteria | 02.233 | 2 (cafeteria above, Athletics Office below) | 603 m² | 1991 |
| **STC** | Student Center | 02.234 | 1 level listed (1,227 m²) | 1,227 m² | 1997 |
| **RHC** | Residence Hall Block C | 02.235 | 3 | 901 m² | 1996 |
| **HC** | LAU Health Clinic (formerly Gate House) | 02.237 | 1 | 128 m² | 2011 |
| **AF** | Animal Facility (labelled "Flex Space Labs" on the building map) | 02.246 | 1 | 177 m² | 2010 |

Site figures from the FM map page: 317,643 m² of land, 99,820 m² built, 13,690 m² of greenery. Not in the FM list but on
the maps: **Water Tank** (by the ELRC) and **Infrastructure Plants** (the long service complex south of the campus).

Parking (FM): A Lower Parking (RIGHT), students, 180 · B Lower Parking (LEFT), students, 180 · C Science Parking,
faculty/staff/LAU vehicles, 94 · D Residence Hall B Outdoor, dorm students, 13 · E Residence Hall B Underground,
faculty/staff, 79 · F Block A Underground, faculty/staff, 18 · G Byblos Underground Parking, all, 568 · I Upper Gate,
faculty/staff, 55 · J ELRC Parking (front), faculty/staff, 44 · K FCC Parking (back), faculty/staff, 160. Total 1,391.
**There is no "H" in the FM list**, but the master plan draws an H lot (see section 9).

FM grounds page lists: flower gardens, landscape clusters, an **outdoor amphitheater**, pathways, sculptures, trees, water
fountains (one near Zakhem Hall), benches and concrete seating, an **accessibility ramp**. No sizes or positions.

## 2. Coordinate system, orientation and camera direction

Same convention as Beirut (`src/campus/geo.js`), with its own origin:

- **Origin**: 34.1155 N, 35.6735 E (about 60 m south of the Main Gate, near the middle of the campus core; the campus is about 750 m long).
- **x = metres east, z = metres south, y = up.** 1 floor = **3.5 m** (3.2 m for residence blocks).
- **Master plan** (`lau-byblos-masterplan.pdf`) is a north-up plan at about **0.63 m per pixel**. I checked that by matching
  its lots A, B, C, D, F, I, K to OSM; they agree within about 25 m. I used it to place everything OSM lacks.
- **The campus is long and thin, running west to east**: Lot A and Residence Block C at the west end (x ≈ −370 to −440),
  the Animal Facility at the east end (x ≈ +310).
- **The reference 3D map is drawn from the north-west, looking south-east.** Evidence: image-left is east (the
  Engineering center is at the left, Residence C at the right), and Block A and Residence B sit side by side at the same
  screen height, so the view direction is perpendicular to the line between them. Block A to Residence B runs
  (−73, +56) m, so the camera looks along about (0.61, 0.79) = south-east (compass bearing ≈ 142°).
- The hill rises **away from that camera** (west to east, and southward), so the campus climbs up the picture like a staircase.

## 3. Top-down grid

Each column is 6 m in x and each row is 12 m in z (the row label is the z at the bottom of the row). **North is up**,
east is right. Two panels because the campus is long. Parking lots are drawn with their official **uppercase letter**,
buildings with **lowercase** letters.

```
WEST (x −450 to −10)
   Z
 -90 |                                                                        a
 -78 | ccc
 -66 | ccc                                                             bbb
 -54 |  c                                                          bbbbbbbb
 -42 |                                                         Dbbbbbbbbb  ====
 -30 |                    BB========BBBBBBBBBBBBBBBBBB       DDDDbbbb  ========
 -18 |   =====           B===BB=BB===B================B           ====2CC==C=C=
  -6 |      AA=====     B==BBB==B===B==============================  ====C====C
   6 |      AA==AA========B BB========                     ====       C===C sss
  18 |      AA====================                   =======            sssssss
  30 |       A======AAA=yy====               HHHH=====     oooooo       sss
  42 |        AAA=======yy===AA              HHH==         oooookkkkk     ttttt
  54 |            AA=A==A=AA=AA                 =          oooooo      IIII====
  66 |                  A=AA=A                   ====               =3=====III
  78 |                                              =====================II
  90 |                                                                  =======
     +-------------------------------------------------------------------------
      -450    -400    -350     -300    -250    -200     -150    -100    -50       X (m)

EAST (x −10 to 430)
   Z
-126 |   aa    ===
-114 |  aaaa  ==lll
-102 |aaaaa ===lllll
 -90 |aaa  ==   llll
 -78 |aa ===    lllll
 -66 | ====      llll nnn   ==
 -54 |======1===GG  nnnn hhhhh===
 -42 |C=GGGGGGGG==  nn  hhhhhhhh===
 -30 |====CGGGGGGG==     hhhhhhhhhh==
 -18 |===GuuGGGGGG ===     hhhhhhh  =
  -6 |suuuuuvvv      ===    hhhh   ==
   6 |suuuu  vv      = ==          =
  18 |s               ==     fff  K====K
  30 | rrrrrrr     ww       ffff  K=KK=K
  42 | rrrrr  zz     ww   ==ffff KK=KK=K
  54 |==     zzzzzz      === fff K==KK=K           =
  66 |  ===     zzzzzz  ===  fff K=KKK=K        eee==
  78 |    ===JJJJ   z ===    fff K=KKK=K        eeeee==
  90 |==    ===================  ==   =           eeeee==
 102 |                        ==========            eeeee==
 114 |                                 ========      eeee =x
 126 |  iii                                   =======    ==xx
 138 | iiiiiiii       iiiiiiiii                      =====xxx
 150 |  iiiiiii      iiiiiiiiii
     +-------------------------------------------------------------------------
       00       50       100     150     200      250     300     350      400    X (m)
```

(The panel boundary falls at x = −10, so the Science Building `s`, Student Center `u` and Service Center `v` at x ≈ −25 to
+45 show up at the left edge of the east panel and at the right edge of the west panel.)

| Symbol | Meaning | Symbol | Meaning |
|---|---|---|---|
| `a` | BA Block A | `k` | CAF Cafeteria |
| `b` | RHB Residence Hall Block B | `o` | Outdoor courts (2) |
| `c` | RHC Residence Hall Block C | `x` | AF Animal Facility |
| `l` | LIB Library | `y` | HC Health Clinic |
| `n` | RNCA Central Administration | `i` | Infrastructure Plants |
| `s` | SCI Science Building | `=` | Roads (OSM) |
| `t` | TR Tohme-Rizk Hall | `1` `2` `3` | Main / Lower / Upper Gate |
| `r` | ARC Architecture Hall | **`A`–`K`** | Parking lots with their official letters |
| `z` | ZH Zakhem Hall | | (D, E, F, G, H, J are drawn from the master plan, not OSM) |
| `w` | BSL Bassil Hall | | |
| `f` | FCC Frem Civic Center | | |
| `h` | CHSC Chagoury Health Sciences Center | | |
| `e` | ELRC Engineering Labs | | |
| `u` | STC Student Center | | |
| `v` | SC Service Center | | |

## 4. Terrain: ground levels and slopes

**The campus is on a steep hillside, so the Beirut approach (one smooth slope) won't work.** Evidence:

- A coarse elevation model (90 m grid, so it only shows the big picture) along the campus's long axis, at z ≈ 0:
  x −400: **203 m** · −250: 218 · −100: 240 · 0: 258 · 100: 262 · 200: 281 · 300: 321 · 350: 321. So the ground rises
  about **120 m from Lot A to the Engineering center** (about 9° on average, steeper at the ends).
  Across the campus (z) it varies by only 10 to 20 m in that data, but it is too coarse to show the steep drop on the north side
  (Block A, Residence B) into the forest seen in the foreground of the reference image.
- The FM floor lists show how buildings are cut into the slope: the Library and Central Administration have their
  **lobby on level 3**, so two floors sit below the plaza; Residence B has a **store, then two parking levels** below its first dorm
  floor; Block A's first two levels are parking F; Byblos Underground Parking is **five levels deep**.

**Proposed terrain model (to build in Stage 2):**

1. a smooth **base slope** from the DEM trend (rises toward east and south),
2. **flat terraces** (platforms) at fixed heights, each with a short blended edge,
3. **ramps** along the roads (heights set at road corner points),
4. **retaining walls** where two levels meet by more than 1 m, and **stair flights** where a walkway crosses them.

Heights below are metres **above Lot A** (y = 0). Absolute elevation ≈ 203 m + y. **All are estimates** (**guess**, ±5 m): the
elevation data is too coarse to give terraces, so I fitted them to the DEM trend and to the FM floor lists. Stage 2 adjusts
them against the reference image.

| Level | Height (y) | What sits on it |
|---|---|---|
| **T0** Gate level | 0 | Lot A, Health Clinic (Gate House), start of the lower road, Residence C (off to the west) |
| **T1** Lower road (ramp) | +6 at x −330, rising to +30 at x −170 | Lot B (long strip along the road), Lot H |
| **T2** Residence level | +38 | Lower Gate (~x −61), Lot D, Lot C road, ground of Residence B (store level) |
| **T3** Science front | +44 | Lot C, Science Building ground floor, Student Center, Service Center |
| **T4** Main plaza | +56 | Main Gate, Library and Central Administration (lobby, level 3), top of Underground Parking G, round plaza and Block A upper entrance |
| **T5** Central plaza | +60 | Fountain plaza, Bassil Hall, Zakhem Hall (auditorium level), Architecture Hall |
| **T6** Upper road | +52 → +62 | Cafeteria, two outdoor courts, Upper Gate (x −69), Lot I |
| **T7** East terraces | +66 | Chagoury Health Sciences Center, Frem Civic Center, Lot K, Lot J |
| **T8** Engineering | +80 | Engineering center (ELRC), Water Tank |
| **T9** Top | +92 | Animal Facility, end of the back road |

Stairs and ramps between levels (all **guess**, positions from the images): (a) steps and a ramp from the Lower Gate up
the front of the Science Building (T2 to T3 to T4); (b) wide stairs from the Main Gate plaza up to the fountain plaza
(T4 to T5); (c) stepped garden terraces east of the plaza, in front of the Chagoury center (T5 to T7); (d) steps from the
Cafeteria terrace to the Upper Gate road; (e) the FM-listed **accessibility ramp**, probably along the Science Building
(unknown, drawn as a gentle ramp beside the stairs in (a)).

## 5. Buildings

Position = centre of the footprint (x, z in metres). Footprint = OSM outline, shown here as the smallest rectangle that
contains it (length × depth). Angle = long axis, degrees from east toward south (same as `orientedRect` in
`buildings.js`). In Stage 2 the exact outline (4 to 20 corner points) is copied from OSM into `buildings.js`, as for Beirut.
Level = terrace from section 4. Height = floors × floor height above that level.

| Code | Position (x, z) | Footprint | Angle | Level | Floors | Roof | Colours (from the 3D map) | Source / confidence |
|---|---|---|---|---|---|---|---|---|
| **BA** Block A | 5, −109 | 52 × 18 | 129° | T4 (base 2 floors below, parking F) | 9 (3.2 m) | **Orange tile bays** on top of a flat roof | Sand-beige walls with balconies, orange tile `#c4502e` | OSM 777277637, **high** |
| **RHB** Residence B | −68, −53 | 63 × 20 | 153° | T2 | 9 (3.2 m) | White flat roof with **orange gable units**, 4 of them | Cream walls with balconies, white top | OSM 777277647, **high** |
| **RHC** Residence C | −438, −75 | 18 × 18 | 115° | T0 (west of Lot A) | 3 | Low orange hip | Cream | OSM 986149009, **guess** (area matches 300 m²; the map only shows an arrow) |
| **LIB** Library | 66, −95 | 54 × 27 | 77° | T4 (lobby = level 3, 2 floors below plaza on the north side) | 5 | **Curved glass-and-copper roof** (flat for Stage 2) | Glass, pink-brown `#a9786a`, white frames | OSM 798924010, **high** |
| **RNCA** Central Admin | 85, −60 | 37 × 19 | 129° | T4 | 5 (lobby = level 3) | Flat, light grey | Glass and white | OSM 798924009, **high** |
| **SCI** Science Building | −25, 13 | 55 × 17 | 154° | T3 | 7 | **Orange hip roof** along the top, balconies | Cream stone `#e3d3a8`, regular window grid | OSM 777277646, **high** (766 m² × 7 = FM 5,365 m²) |
| **TR** Tohme-Rizk Hall | −28, 35 | 31 × 7 | 177° | T6 | 4 | Orange hip | Cream | OSM 777277644, **high** |
| **ARC** Architecture Hall | 22, 27 | 36 × 16 | 175° | T5 | 6 | **Stepped terracotta hip roofs** | Tall beige with a dark base | OSM 777277643, **high** |
| **ZH** Zakhem Hall | 62, 49 | 55 × 16 | 28° | T5 | 7 (stepped) | Orange hip, taller stair tower | Cream | OSM 777277645, **high** |
| **BSL** Bassil Hall | 82, 32 | 27 × 7 | 48° | T5 | 5 | Orange hip, small | Cream | OSM 987117571, **guess** (OSM footprint, 181 m², is small for 5 floors at 1,214 m²) |
| **FCC** Frem Civic Center | 134, 58 | 70 × 26 | 89° | T7 | 5 | Orange hip with a **semicircular end** | Cream and orange | OSM 987117570, **high** |
| **CHSC** Chagoury center | 138, −39 | 54 × 43 | 47° | T7 | 6 | Mostly **flat white** with an orange-tile pitched wing on the west side, skylights | White and pale grey, orange accent | OSM 627179965, **high** |
| **ELRC** Engineering Labs | 259, 77 | 71 × 16 | 47° | T8 | 7 | Flat, with a **rounded south-east end** | Brown-beige with tinted glass bands | OSM 787559642, **medium** (area suggests a wider building: 1,083 m² × 7 < 9,705 m²) |
| **STC** Student Center | 12, −10 | 33 × 19 | 149° | T3 | 2 (FM: level 1 only) | **Grey curved glass vault**, as in the 3D map | Grey glass and concrete | OSM 1191770841, **guess** (366 m² vs. FM 1,227 m²) |
| **SC** Service Center | 38, −8 | 14 × 11 | 0° | T3 | 3 | Orange hip, small | Cream | **Hand-placed (guess)**, ±15 m, 154 m² footprint = FM 478 m² / 3 |
| **CAF** Cafeteria | −84, 36 | 26 × 14 | 0° | T6 | 2 | **Dark navy curved roof** | White walls, navy `#1f3a5f` roof | Hand-placed inside the OSM zone "Cafateria" (x −96 to −71, z 17 to 54), **medium** |
| **HC** Health Clinic | −335, 28 | 12 × 10 | 0° | T0 | 1 | Orange hip | Cream | **Hand-placed (guess)**, by Lot A's gate |
| **AF** Animal Facility | 311, 122 | 23 × 17 | 80° | T9 | 1 | Flat | Plain light grey | OSM 1191749379, **medium** |
| **UGP** Underground Parking | ≈ 35, −40 | ≈ 56 × 44 (guess) | 0° | below T4 | 5 underground | Not drawn above ground | Entrance drum, see section 6 | Footprint **guess**: 18,950 m² / 5 levels ≈ 3,800 m² per level; lot G on the master plan |
| Water tank | 363, 81 | 25 × 22 | | T8 | 2 | Flat | Concrete grey | OSM 787559643, **guess** (label only on the parking map) |
| Infrastructure Plants | 14, 132 and 124, 138 | 45 × 20 and 55 × 16 | 23° / 173° | T7, behind the campus | 2 | Flat | Concrete grey | OSM 1191770839 and 1191749375, **guess** (match the master plan's "Byblos Infrastructure") |

**Heights I'll use**: BA 28.8 m, RHB 28.8 m, LIB 17.5 m above T4, SCI 24.5 m, ZH 24.5 m, ELRC 24.5 m, CHSC 21 m, ARC 21 m, FCC 17.5 m.

**Neighbouring houses**: OSM has about 100 village houses around the campus (Blat to the north-west, others to the north). **The reference
image shows only dark forest in the foreground**, so I propose **not** drawing them (a simple dark forested slope, like the
image), or only the closest ones as plain blocks if you'd rather have them. See question 3 in section 13.

## 6. Gates and entrances

| Gate | Position (x, z) | Level | Notes |
|---|---|---|---|
| **Main Gate** | 26, −60 | T4 | North side, between Block A and the Library. Small gatehouse with a barrier, opening to the plaza. A grey **round drum** (the Underground Parking ramp/stair) stands just beside it on the 3D map. |
| **Lower Gate** | −61, −20 | T2 | Between Residence B and Lot C, on the lower road (OSM road junction at about (−60, −13)). Gatehouse and barrier. |
| **Upper Gate** | −69, 64 | T6 | On the south "ring" road (OSM), behind the Cafeteria, next to Lot I. Gatehouse and barrier. |
| **Gate House** (Health Clinic) | −335, 28 | T0 | The original gate house at the west end, now the LAU Health Clinic. Not one of the three named gates. |

Gate positions are from the master plan and the OSM road junctions (**medium**; ±15 m). Each gets an orange label, as on the maps.
The gates are on **three different levels** (T2 / T4 / T6), so the labels sit at different heights.

## 7. Roads (OSM)

Widths follow Beirut's table (`service` 5 m, `tertiary` 9 m, `unclassified` 7 m).

| Road | Route (x, z) | Level | Notes |
|---|---|---|---|
| **Lower road** | from the Blat road at (−430, −15) east along Lots A and B, up to the Lower Gate (−61, −20) | T0 to T2 | OSM `tertiary` then `service` (way 708713250, 249222125). 5 to 9 m, with Lot A on its south side and Lot B on both sides. |
| **Campus road** | from the Lower Gate east along the Science front (−60, −13) to (9, −31), then to the Main Gate | T2 to T4 | OSM service roads, with a junction at (−60, −13). |
| **Main spine** | from the Main Gate (26, −60) south-east to (88, −10), (166, 11), (155, 93) | T4 to T7 | OSM service roads 777277642, 777277639 and 992652061. Serves the Library, Central Admin, Chagoury center and Lot K. |
| **Ring (back) road** | from the Upper Gate (−63, 61) east along the south edge: (9, 58), (62, 86), (184, 100), (289, 130), (303, 104), (261, 45) | T6 to T9 | OSM way 249222125. Passes Lot I, the Infrastructure Plants, the Engineering center and up to the Animal Facility. |
| **Lot A and B connectors** | short service roads along the parking strips | T0 to T1 | OSM, e.g. ways 992652067 to 992652077. |
| **Blat road** | along the campus's west edge at x ≈ −435 | T0 | OSM `tertiary`. |

## 8. Plazas, terraces, gardens, trees, sports

None of this is in OSM. **All positions and shapes below are from the images (guess, ±15 m)** and will be fitted in Stage 2.

**Plazas and terraces**
- **Main plaza** (T4): the open square between the Main Gate, Library, Central Administration and the Student Center, on top of the Underground Parking. Stone paving.
- **Round fountain plaza** (T5): east of Bassil Hall and in front of the Chagoury center, about (95, −5), radius about 20 m, with the **fountain** (OSM point amenity=fountain at (44, 11) is another smaller one by the Architecture Hall; the FM grounds page says one fountain is near Zakhem Hall, which fits).
- **Garden terraces** (T5 to T7): stepped lawns between the plaza and the Chagoury/Frem buildings, about 3 steps of 2 m.
- **Outdoor amphitheater** (FM grounds page): the half-round stepped area beside Bassil Hall on the 3D map, about (70, 15), radius about 12 m, 5 tiers. **Unverified.**
- **Cafeteria terrace** (T6): paved area around the Cafeteria and the courts, reached from the Upper Gate road.

**Footpaths and stairs** (traced from the 3D map): Main Gate to the plaza (north to south, 6 m wide); plaza to the fountain plaza
(with stairs); fountain plaza to Zakhem/Bassil/Architecture (east to west); Lower Gate up the Science front (path, stairs, ramp);
Science to Tohme-Rizk to the Cafeteria and Upper Gate; the east promenade to the Chagoury, Frem and Engineering
buildings; Block A to Residence B along the north edge. Paths 2.5 to 4 m wide, stairs 3 to 6 m wide, as in Beirut.

**Gardens and lawns**: lawns around the fountain plaza, in front of the Library and Central Administration (stepped, on the plaza edge), left of Block A,
along the Science front, and beside the Chagoury center. A few flower beds with shrubs and flowers (reuse the Beirut `PATCHES`
system). Roughly 13,690 m² of greenery in total (FM).

**Trees** (instanced, about 250 to 350, mostly pines and cypresses on this campus):
clusters by the Cafeteria and courts (−120 to −70, 10 to 60); rows along the lower road and Lot B; hillside trees
below Block A and Residence B (the dark forest in the reference image); between lots C and I; behind the Chagoury center.
Beyond the campus: **wooded slopes** (OSM has several `natural=wood` and `scrub` polygons) drawn as a dark green ground.

**Sports**: two outdoor courts next to the Cafeteria at about (−120, 35) and (−103, 35), each about 16 × 30 m, green surface with
lines (the athletics site: "two outdoor courts next to the cafeteria building, newly renovated, can host mini-football, tennis,
volleyball and basketball"). The Fitness Center is inside the Student Center (no outdoor shape). **Byblos has no on-campus
pool or full-size pitch** according to the athletics site, so none are drawn.

## 9. Parking lots

Lots are drawn with their official letters and the blue "P" badge, as on the parking map. Where OSM has the polygon it is used.

| Lot | Name (FM) | Who | Cars | Shape | Source |
|---|---|---|---|---|---|
| **A** | Lower Parking (RIGHT) | Students | 180 | OSM, x −414 to −302, z −12 to 65 | OSM 777277649, T0 |
| **B** | Lower Parking (LEFT) | Students | 180 | OSM long strip, x −344 to −154, z −42 to 4 | OSM 777277648, T1 ramp |
| **C** | Science Parking | Faculty/staff/LAU vehicles | 94 | OSM, x −67 to 17, z −50 to 7 | OSM 798461901, T3 |
| **D** | Residence Hall B Outdoor | Dorm students | 13 | about 26 × 12 at (−108, −38) | **guess** (master plan), T2 |
| **E** | Residence Hall B Underground | Faculty/staff | 79 | footprint of Residence B, underground | **guess**, T2 |
| **F** | Block A Underground | Faculty/staff | 18 | under Block A | **guess**, T4 |
| **G** | Byblos Underground Parking | Students/faculty/staff | 568 | about 56 × 44 at (35, −40) under the main plaza, 5 levels | **guess**, T4 |
| **H** | (not in FM list) | | | about 22 × 16 at (−204, 31) | **guess** (master plan). Drawn without a place unless you want it. |
| **I** | Upper Gate | Faculty/staff | 55 | OSM, x −61 to −14, z 41 to 71 | OSM 992652058, T6 |
| **J** | ELRC Parking (front) | Faculty/staff | 44 | small angled lot, about 26 × 8 at (42, 76) | **guess**: the master plan and 3D map put it beside Zakhem/Architecture, though FM says "in front of ELRC" |
| **K** | FCC Parking (back) | Faculty/staff | 160 | OSM, x 154 to 194, z 5 to 73 | OSM 777277638, T7 |

An unlabelled OSM parking polygon sits south of Tohme-Rizk Hall (x −65 to 10, z 60 to 99, 1,931 m²). It has no letter anywhere,
so I propose **not** drawing it as a lot (it's the road verge near the Upper Gate). The underground lots (E, F, G) get a translucent
outline and an entrance badge when the Parking category is open, like the Beirut underground lot.

## 10. The sea and the old city

- **Old Byblos** (castle, port, souk) is about **2.4 km west-north-west** of the campus: roughly 34.1195 N, 35.6475 E, i.e. at
  x ≈ −2,400, z ≈ −550 from the origin (**approximate**, from general knowledge, not from the supplied data).
- The **Mediterranean** lies beyond it: the coast runs roughly north to south about 2.2 km west of the campus.
- **The reference camera looks south-east, so the sea and old city are behind the camera.** The campus "overlooks" them in
  the sense that the hill falls toward them, which is the side the reference camera sits on.

**Proposal**: the **default camera follows the reference image** (needed for the Stage 2 side-by-side comparison, same as
Beirut). The **sea and old-city horizon** are drawn on the west and north-west side (a flat blue plane to the horizon, a low
cluster of sand-coloured blocks and a stub of the castle, no detail), and appear when the user orbits west or
north-west. If you want the *default* view to face the sea instead (camera on the hill looking west-north-west across the campus, which gives a very
different picture from the reference), that's possible as a second preset. See question 1.

## 11. Default camera, controls and scene size

- **Scene bounds**: x −470 to +400, z −170 to +200 (about 870 × 370 m, about 2.4 times the area of Beirut's 400 × 340 m).
- **Default view**: perspective, field of view about 25° (the reference image is very wide, 1568 × 606, aspect 2.6), looking
  south-east (bearing ≈ 142°), about 28° above the horizon, aimed at about (−40, 55, 0). Distance about 1,000 m. **Initial guess**; Stage 2
  solves it by matching building positions to the image, as for Beirut.
- **Phones**: the scene is much wider than Beirut's, so the "fit the width" scaling stays (`narrowScreenFit`), but the default view on a
  phone shows the middle of the campus (Library to Chagoury) and users pan along the long axis.
- **Orbit limits**: zoom 40 to 1,800 m; tilt up to 78° from vertical (never below ground; the ground is no longer flat,
  so the limit follows the terrain height); panning limited to the bounds.
- **Offscreen markers**: Beirut has one for the Gezairi Building. Byblos has **Residence Hall Block C** (far west, as in the
  reference image's red arrow) and the **Animal Facility** (far east).

## 12. How it plugs into the code (for Stage 2)

Today the 3D code reads Beirut's data directly: `buildings.js`, `site.js` and `geo.js` export constants that `geometry.js`, `details.js`,
`pins.js`, `CampusView.jsx` and the others import. To add a second campus **without duplicating code**:

- Move Beirut's data (as is, unchanged) to `src/campus/beirut/` and add `src/campus/byblos/` with the same three files:
  `buildings.js`, `site.js`, `geo.js` (its own origin) and an OSM file for Byblos.
- A small registry, `getCampus(id)`, returns the right set for the chosen campus. The 3D view picks it from the `campus`
  prop (`App.jsx` already tracks it), and the existing modules take that set as an argument or read it from context.
- **Terrain**: `heightAt` stays a function. Beirut keeps its smooth slope. Byblos supplies platforms, ramps and a base slope
  (section 4), baked once into a height grid so `heightAt` stays fast for trees, lamps and pins.
- Everything else is **reused unchanged**: building system (parts, styles, windows, roofs, extras), pins, sidebar, search, categories,
  label layout, night lights, parking layer. New roof types are added to the shared set (`vault` for the Cafeteria and Student Center, curved
  copper/glass for the Library). The terraces/amphitheater/hangout systems become per-campus lists.
- The switcher flips `byblos` to `active: true` and `App.jsx` renders the 3D view for the chosen campus (the comment there says
  only Beirut has a model today).
- Beirut must look and behave **exactly** as now. I'll check this with before/after screenshots at the default view.

## 13. Guesses (everything the sources don't say)

1. **Origin** (34.1155 N, 35.6735 E) is a convenience, not an official point.
2. **Terrace heights** (T0 to T9) are estimates from a coarse elevation grid and the FM floor lists (±5 m).
3. **Building identification**: Student Center (OSM 1191770841), Bassil Hall (OSM 987117571), Residence C (OSM 986149009), Animal Facility
   (OSM 1191749379) are **matched by size and position**, not by name (OSM has no name on them). Service Center, Health Clinic and the Cafeteria are
   hand-placed. If you know the real positions, tell me.
4. **Floors** follow FM. Where FM is inconsistent (Bassil Hall "four" vs. five levels; Student Center one level vs. a 1,227 m² area), I used the level list and the OSM footprint.
5. **Colours and roof shapes** are read from the 3D building map. Hidden sides get the same look as the visible front.
6. **All paths, stairs, lawns, trees, courts, fountains and the amphitheater** are traced from the images (OSM has none).
7. **Lots D, E, F, G, H, J** are placed from the master plan (accuracy about 25 m). The Lot J position conflicts with FM's description.
8. **Gates**: positions from the master plan and OSM road junctions.
9. **Old city and sea** positions are approximate.
10. **Neighbouring houses**: not drawn (matches the reference image).
11. **Water Tank and Infrastructure Plants** are shown as plain blocks (no FM entry).
12. FM building pages carry last-updated dates between 2020 and 2021, so "functions per level" may have changed. They go into Stage 4 as `verified: false`.
13. **(stage 2) Terrace heights** are estimates (table at the top). Two of them, T4 and T8, were moved away from the SRTM values to fit the reference image.
14. **(stage 2) Block model**: roofs are flat everywhere (the real hip, vault and curved roofs are stage 3), the Library and Central Administration lobbies are assumed to be on level 3 (so two floors show only on the north side), and Block A and Residence B are assumed to have two and three floors below the plaza and the Lower Gate road.
15. **(stage 2) Underground parking**: only the entrance drum next to the Main Gate is drawn above ground; its position (42, −54) is a guess.
16. **(stage 2) Camera** is fitted to landmarks read by eye from the reference image (±10 px), and the reference is an illustration, not a true perspective.
17. **(stage 2) Sea and old town**: the old town is a placeholder cluster of 70 random blocks and a keep at about 2.4 km west-north-west; the coast is a straight line 2.25 km west.
18. **(stage 2) Floor counts versus the images**: Zakhem Hall (FM 7) looks like 5 to 6 rows of windows in the image, and the Engineering center (FM 7) like 8 to 9. I kept FM's counts and will compare once facades are drawn (stage 3).

## 14. Questions for you

1. **Default camera**: follow the reference (looks south-east, sea and old city *behind* the camera, drawn on the horizon when you orbit), or face the sea?
   My recommendation: the reference view, because Stage 2 compares against that image. A second "sea view" preset is cheap to add later.
2. **Terraces**: the fitted heights are rough. If you have **photos or a site plan with levels**, send them; otherwise I'll tune against the reference image in Stage 2.
3. **Neighbouring village houses**: leave them out (matches the image, lighter on phones; **recommended**), or draw the nearest as plain blocks?
4. **Lot H** (on the master plan, not in FM): draw it without a place, or leave it out? (Recommended: draw it; no place.)
5. **Shelters and Assembly points**: Beirut has these categories. FM mentions a **bomb shelter** in the Underground Parking and a **"Shelter and Testing Room"** in the ELRC. Your list for
   Byblos (Stage 4) doesn't include them. Add the two categories for Byblos with those entries, or skip? (Recommended: add the two shelters only, as unverified.)

**Nothing has been committed or built.** Only this file is new (`docs/byblos-layout.md`), on the branch `byblos-campus`.
