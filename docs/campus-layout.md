# LAU Beirut campus: 3D layout plan

> **Update (stage 2): corrected with OpenStreetMap.** The numbers in the code now come
> from OSM building outlines, not the estimates below. What changed:
>
> - **Coordinates** are now real metres from a GPS origin (33.8930 N, 35.4781 E), with
>   x = east and z = south (see `src/campus/geo.js`). The reference image is drawn from
>   the **north-east, looking south-west**: image left is east and image depth is south.
> - **Nicol Hall is in front of the Student Center** (north of it), not beside it.
> - **Most footprints are smaller** than estimated below. The whole campus is about 235 × 150 m.
>   The exceptions are Sage Hall (its OSM outline is too small compared with the image, so
>   it's rebuilt as a centre block plus two wings, about 44 m wide) and Irwin (about 37 × 39 m).
> - **Streets**: front street = El-Hussein; Lower Gate street = Father Lammens; street behind
>   Sage and the Upper Gate = Rue Tabbara. Sadat St starts about 80 m north of the Lower Gate
>   via Badr Demachkieh.
> - **Gezairi**: placed on the OSM outline of the first building on Sadat St (west side),
>   about 105 m from the Lower Gate. **Unconfirmed.**
> - **Camera** was calculated by matching 11 building positions to the reference image
>   (looking south-west, 26° down, about 290 m away, 28° field of view).
> - **Hill**: one smooth slope from 0 m (front street) to 8 m (Sage, Upper Gate) instead of four flat levels.
> - Building and site settings: `src/campus/buildings.js` and `src/campus/site.js`.
>
> Screenshots: `docs/screenshots/stage2-compare.png` (reference vs block model) and
> `stage2-overlay.png` (the two overlaid).

Stage 1 of the 3D campus: the measurements the scene will be built from. They come from the two
official 3D campus maps (buildings and parking) and are estimated by comparing buildings
with each other. They will be corrected in stage 2 by putting screenshots next to the reference image.

## 1. Coordinate system

- Units are **metres** (approximate). 1 floor = **3.5 m** (3.2 m for Gezairi).
- **X** runs left to right as the campus appears in the reference image, along the front street
  in front of University Services.
- **Z** runs from front to back, from the front street (Z ≈ 0) up the hill to the Upper Gate
  and Middle Gate (Z ≈ 160).
- **Y** is up. In Three.js the scene uses `x = X`, `y = Y`, `z = -Z`, so the default camera
  (in front of the campus) looks toward −z, which is the Three.js convention.
- The plan is aligned to the reference image, **not to true north**. The image is drawn from
  roughly the south-west, looking north-east.
- The reference image is drawn with perspective, so its front street slopes up to the right by
  about 17° and the right-hand (Lower Gate) street at about 43°. In plan, the front street runs
  along X and the Lower Gate street runs diagonally (about 45°).

## 2. Top-down grid

Each column is 5 m in X and each row is 10 m in Z. The row label is the Z value at the bottom of
the row, so the back of the campus is at the top.

```
   Z
 185 |                             ==========================
 175 |..............................PPPPPPPPPPP.............
 165 |..............................PPPPPPPPPPPAAAAAAAA.....
 155 |=================.............PPPPPPPPPP2AAAAAAAA.....
 145 |WWWWWWWWWNNNNNNN....................OOOOOAAAAAAAA.....
 135 |WWWWWWWWWNNNNNNN.................OOOOOOOOAAAAAAAA.....
 125 |WWWWWWWWWNNNNNNN=1===============OOOOOOOOOOO.RRRRRRRRR
 115 |WWWWWWWWWNNNNNNNaaaaSSSSSSSSSSSSSOOOOOOOOOOO.RRRRRRRRR
 105 |WWWWWWWWWNNNNNNNaaaaSSSSSSSSSSSSSOOOOOOOOOOO.RRRRRRRRR
  95 |....FFFFFFFFFFttttttSSSSSSSSSSSSS____OOOOOOO.RRRRRRRRv=
  85 |....FFFFFFFFFFtttttt*************____.............====
  75 |....FFFFFFFFFFpppppp*************...............====..
  65 |....FFFFFFFFFFppp^^^^IIIIIIIIIII.hhhhh........====LLLLL
  55 |..........gggggggggg.IIIIIIIIIII.hhhhh......====..LLLLL
  45 |..........gggggggggg.IIIIIIIIIII.hhhhh....====....LLLLL
  35 |..........gggggggggg.IIIIIIIIIII*****...====..........
  25 |..........gggggggggg.IIIIIIIIIII****3..===.############
  15 |..........gggggggggg.................====..############
   5 |............UUUUUUUUUUUU.............==....############
  -5 |............UUUUUUUUUUUU.............==...............
 -15 |=========================================
 -25 |          ############################ ====
 -35 |          ############################   ====
 -45 |          ############################     ====
 -55 |                                             ===GGGG
 -65 |                                                GGGG
     +-------------------------------------------------------
      0         50        100       150       200       250   X (m)
```

| Symbol | Meaning | Symbol | Meaning |
|---|---|---|---|
| `W` | WKSC Student Center | `g` | Tennis courts (on top of GYM) |
| `N` | NH Nicol Hall | `^` | Dark canopy / shed |
| `F` | SFA Safadi Fine Arts | `p` | Sandy plaza |
| `U` | US University Services | `t` | Green stepped terraces |
| `I` | IH Irwin Hall | `a` | Amphitheater |
| `S` | SH Sage Hall | `*` | Tree clusters |
| `h` | ShH Shannon Hall | `=` | Streets |
| `O` | OG Orme-Gray | `#` | Surrounding blocks (grey) |
| `_` | Orme-Gray podium / terrace | `P` | M: Middle Gate Parking |
| `A` | AKSOB Adnan Kassar School of Business | `L` | L: Lower Gate Parking |
| `R` | RNL Riyad Nassar Library | `v` | U: Underground Parking entrance |
| `G` | GB Gezairi Building (new) | `1` `2` `3` | Upper / Middle / Lower Gate |

## 3. Ground levels

The campus is built on a hill, with the terraces and stairs climbing from the front street up to Sage Hall.
The scene uses a few flat levels instead of a sloped terrain. That's cheaper to draw and closer to the
stepped look of the image.

| Level | Height (Y) | What sits on it |
|---|---|---|
| L0: street | 0 m | Front street, Lower Gate street, Sadat St, surrounding blocks, L parking, Gezairi |
| L1: lower campus | 2 m | University Services, Irwin Hall, Shannon Hall, plaza, Gym court deck (courts at +5 m) |
| L2: middle | 6 m | Safadi Fine Arts, Orme-Gray podium, the lower half of the terraces |
| L3: upper campus | 10 m | Sage Hall, amphitheater, Student Center, Nicol, Orme-Gray, Upper Gate, Middle Gate, M parking, AKSOB, RNL |

The terraces (`t`) step from L1 up to L3 in 4 curved steps of about 2 m, each with a grass top and a stone wall at the front.

## 4. Buildings

Footprints are axis-aligned rectangles unless noted. Height = floors × 3.5 m above the building's ground level.

| Code | Name | X range | Z range | Footprint (W×D) | Level | Floors (height) | Roof | Facade / colours |
|---|---|---|---|---|---|---|---|---|
| **WKSC** | Wadad Sabbagh Khoury Student Center | 0–46 | 108–158 | 46×50 | L3 | 6 (21 m) | Flat, with an open central courtyard (the "Cafeteria"), about 24×22 m, set back toward the rear. Cream curved roof shell over the back-left corner. | White `#eceeed`, cream roof shell `#e6c787`, regular window grid |
| **NH** | Nicol Hall | 46–80 | 108–158 | 34×50 | L3 | 6 (21 m), arched ground floor | Flat, light grey `#cfd3d2` | White, window grid, row of arches on the ground floor facing the terraces |
| **SFA** | Safadi Fine Arts | 22–72 | 65–105 | 50×40 | L2 | 4 (14 m) | **Sawtooth**: 6 × 5 grid of white skylight "teeth", glazing facing the back (+Z) | Upper floors white with narrow vertical windows. Lower 2 floors at the front-right are orange-tan `#d9a15a`. |
| **GYM** | Joseph G. Jabbra Gymnasium | 48–100 | 20–62 | 52×42 | L1 | Mostly below the deck, 1 floor showing at the front (3 m) | Flat deck holding **2 tennis courts** side by side, long axis along Z. Green `#4c7d3c`, white lines, low fence. | Grey concrete front wall `#9a9e9b` |
| **US** | University Services | 62–122 | 0–16 | 60×16 | L1 | 5 (17.5 m) | Flat, white | White, with continuous **orange balcony bands** `#d99a4e` on every floor of the front facade |
| **IH** | Irwin Hall | 105–160 | 22–80 | 55×58 | L1 | Front block (Z 22–50): 4 (14 m). Rear block (Z 50–80): 5 (17.5 m). | Front block flat white. Rear block red **hip roof** `#c4502e` with a small flat glass lantern on top. | Brown stone/brick `#8a5a45`. Front facade has a ground-floor **arcade** (about 7 arches) and a glass bay/canopy across the middle, about 25 m wide. |
| **SH** | Sage Hall | 100–165 | 98–126 | 65×28 | L3 | Centre block 4 (14 m), side wings 3 (10.5 m) | **Three red hip roofs**: a tall centre block (X 118–147) and two lower wings, plus a small cross-gable at the rear right | Rose-brown stone `#8e5e4e`, tall arched windows in regular rows |
| **ShH** | Shannon Hall | 166–190 | 50–78 | 24×28 | L1 | 4 (14 m) | Flat, light, with a small rooftop box (stair/plant room) | Stone `#9b7058`, small windows, a light band at the top |
| **OG** | Orme-Gray | 165–222 | 100–160 | 3 parts + podium | L3 | West wing (X 165–185, Z 108–150): 6. East block (X 185–222, Z 100–140): 6. Middle block (X 180–205, Z 140–160): 5. | West wing and east block: low red hip roofs (tiled edge). Middle block: full red **hip roof**. | White with **orange vertical panels** between the window columns `#e0a35a`. The podium (X 165–185, Z 85–108) is a dark grey 1-storey terrace `#5c5f5e`. |
| **AKSOB** | Adnan Kassar School of Business | 205–245 | 140–178 | 40×38 | L3 | **11 (38.5 m)**, the tallest on campus | Flat, with a small rooftop setback | White `#f2f3f3`, dense window grid, a vertical glass strip `#5f8a96` on the front-right corner |
| **RNL** | Riyad Nassar Library | 225–268 | 100–138 | 43×38 | L3 | 8 (28 m) | Flat, with a light parapet | White, wide horizontal **glass bands**. **Cylindrical** glass tower (r about 4 m, 6 floors) at the front-left corner. Hedge along the base. |
| **UGP** | Underground Parking | about 205–265 | about 95–145 | (under OG/RNL) | below L3 | n/a | Not drawn above ground. Shown as an entrance portal on the Lower Gate street at about (266, 100), plus a translucent outline of the footprint when the Parking layer is on. | Dark portal `#2b2b2b`, "U" badge |
| **GB** | Gezairi Building (**new**, not in the images) | 238–262 | −62 to −40 | 24×22 | L0 | **13 (41.6 m)** | Flat, with a rooftop plant box | **Placeholder look** (no photos were attached): light beige concrete `#d8cdb8`, horizontal ribbon windows. I'll match it to photos when you send them. |

## 5. Gates

| Gate | Position (X, Z) | Level | Model |
|---|---|---|---|
| Upper Gate | (88, 130) | L3 | Small gatehouse, 5×5×3 m, red pyramid roof, on the street behind the amphitheater |
| Middle Gate | (200, 162) | L3 | Opening in the back of the Orme-Gray middle block, facing M parking. Small canopy and marker. |
| Lower Gate | (182, 28) | L1/L0 | Small gatehouse, 5×5×3 m, red pyramid roof, at the Lower Gate street with steps up into the campus |

Each gate gets an **orange label** (`#f0a030` with dark text) like the reference image. The labels are always visible.

## 6. Streets, open spaces and surroundings

| Feature | Geometry | Colour |
|---|---|---|
| Front street | X 0–195, Z −12 to −2, L0 | Asphalt `#8c887d` |
| Lower Gate street | 10 m wide, through (272,100), (215,45), (192,15) and (192,−10) | Same |
| Sadat Street (red arrow) | From (192,−10) toward (255,−65). Gezairi sits on its east side. | Same, with a **red arrow** decal pointing to GB |
| Street behind Sage / Upper Gate | X 80–165, Z 128–138, L3 | Same |
| Street behind Student Center | X 0–80, Z 158–168 | Same |
| Back street (behind M parking / AKSOB) | X 150–270, Z 186–194 | Same |
| Surrounding blocks | X 50–190 / Z −42 to −14 (2–3 floors). X 215–275 / Z 5–40 (2 floors). Plus a few filler blocks around the edges. | Plain light grey `#cfcfca`, no windows |
| Plaza | X 72–104, Z 62–82, L1 | Sand `#d9cfb5` |
| Canopy / shed | X 86–104, Z 62–72, 4 m high, flat dark roof | `#3f4242` |
| Terraces | X 72–100, Z 82–106, 4 curved steps | Grass `#6f8f4a`, stone walls `#a08268` |
| Amphitheater | Centre (90, 116), radius 10 m, half-circle opening toward the front, 5 tiers | Stone `#b9a58a`, grass ring |
| Paths | Plaza → Irwin front, Irwin → Lower Gate, terraces → Sage, Sage → Orme-Gray | Sand, 3 m wide |
| Trees | Clusters between Irwin and Sage, on the terraces, near Shannon and the Lower Gate, along the Irwin front planters, and along the US/Irwin front hedge. About 60 trees in total. | Dark green `#2f5a3a` (two shades) |
| Outer ground | Beyond the campus. Dark green-grey like the image background. | `#3d4a45` |

## 7. Parking layer (toggle)

| Code | Name | Area | Shown as |
|---|---|---|---|
| **M** | Middle Gate Parking (Students/Faculty/Staff) | X 150–205, Z 160–186, L3 | Dark asphalt `#3a3a3a` with white bay lines. Always drawn; the toggle adds the badge and highlight. |
| **U** | Underground Parking (Faculty/Staff) | Entrance at (266, 100); footprint about X 205–265, Z 95–145 | Translucent blue outline of the footprint and an entrance badge |
| **L** | Lower Gate Parking (LAU Vehicles/Authorized) | X 248–274, Z 45–75, L0, east of the Lower Gate street | Asphalt with angled bays |

The toggle shows a floating **blue "P" + circled letter** badge for each lot (as in the reference image) and highlights the lot.

## 8. Default camera and controls

- **Default view** (to match the reference): perspective camera, field of view about 30°, looking at about
  (140, 8, 85) from about 330 m away, 38° above the horizon, turned slightly toward the right side of
  the campus. The exact numbers will be tuned in stage 2 against the reference image.
- **Orbit limits**: tilt between 15° and 80° from vertical (the camera can never go below ground);
  zoom from 60 m to 600 m; panning limited to the campus bounds (X −20…290, Z −80…200).
- **Gezairi in the default view**: it sits just off the bottom-right corner of the reference image.
  I'll widen the default view a little so it's visible.

## 9. Scene config shape

Each building will be one entry in `src/campus/buildings.js`. The `id` is the official code and matches `places.json`:

```js
{
  id: 'IH',                       // official code, also the id in places.json
  name: 'Irwin Hall',
  level: 2,                       // ground height (m) it stands on
  parts: [                        // one or more boxes; most buildings have 1–3
    { x: [105, 160], z: [22, 50], floors: 4, roof: 'flat' },
    { x: [105, 160], z: [50, 80], floors: 5, roof: 'hip' },
  ],
  facade: 'stone',                // stone | white | whiteOrange | beige
  windows: { cols: 14, style: 'arched' },
  extras: ['arcade', 'glassBay'], // optional details added in stage 3
}
```

Materials are shared: one material per facade type, roof type, window and tree type. Windows and trees use **instanced meshes**.

## 10. Guesses (things the images don't show)

1. **Hidden sides**: the back and right sides of buildings are given the same facade as the visible front.
2. **Heights** are from window-row counts: AKSOB about 11 floors, RNL about 8, Student Center/Nicol/Orme-Gray 6, US and Irwin rear 5, Sage centre, Irwin front, Shannon and SFA 4. Sage wings 3.
3. **Hill levels** (0 / 2 / 6 / 10 m) are estimates from the stairs and terraces in the image.
4. **Gymnasium**: assumed to be mostly underground, with the tennis courts on its roof.
5. **Student Center vs. Nicol boundary**: the image shows one connected white complex. I split it where the Nicol Hall label sits (X ≈ 46).
6. **Underground Parking** footprint and entrance are guessed from where the "U" marker is.
7. **Gezairi**: position from the red arrow (about 50 m past the Lower Gate along Sadat St), 13 floors at 3.2 m each. Its look is a **placeholder** because no photos were attached.
8. **Scale**: absolute metres are rough, but the relative sizes between buildings come from the image.
9. **True orientation**: the plan uses image directions, not compass directions. This doesn't affect the 3D view.

## 11. Open questions

1. **Gezairi photos**: your message mentions "attached photos", but only the two campus map PDFs came through. Please send them if you'd like the building to match the real one; otherwise I'll keep the plain placeholder.
2. **OpenStreetMap footprints (optional)**: OSM has free building outlines for the LAU Beirut campus.
   I could use them to check the footprints and distances in this plan; positions would still follow the
   image view. Say if you'd like that. Otherwise I'll stick strictly to the images.
3. **places.json and the existing app**: my proposal is to add one place per building with `id` set to the
   code (e.g. `"SH"`), and give the existing places a `building` field holding that code. Tapping a building
   would then show its details plus the offices and services inside it. The list view, search, category
   chips and campus switcher would stay; the 3D campus replaces only the map. Latitude/longitude would
   become optional and be kept only for the "Directions" link.
