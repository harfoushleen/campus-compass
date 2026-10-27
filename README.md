# Campus Compass

A free, mobile-first web app that helps LAU students find facilities and resources on a 3D model of the campus.
Built with React + Vite + Three.js (react-three-fiber). No API keys or paid assets, installable as a PWA, and it works offline after the first visit.

## Run locally

Requires [Node.js](https://nodejs.org) 20.19+ or 22.12+.

```bash
npm install      # first time only
npm run dev      # start the dev server at http://localhost:5173
```

To open it on your phone (same Wi-Fi), run `npm run dev -- --host` and open the "Network" URL it prints.

To test the real production build, including offline mode and installing the app:

```bash
npm run build
npm run preview  # http://localhost:4173
```

The service worker only runs in the built version, not in `npm run dev`.

## Folder structure

```
public/                 Static files copied as-is (app icons, favicon)
scripts/make-icons.js   Regenerates the PNG app icons (npm run icons)
scripts/fetch-osm.js    Re-downloads streets (and Beirut's neighbouring buildings) from OpenStreetMap (npm run osm, npm run osm -- byblos)
docs/                   3D layout plans (campus-layout.md = Beirut, byblos-layout.md = Byblos) + comparison screenshots
src/
  data/
    places.json         ← ALL PLACES LIVE HERE. Edit this to add or change places.
    places.js           Loads places.json and warns in the console about mistakes
    categories.js       Category ids + marker colors
    campuses.js         Campuses and whether each one is active
  campus/               ← THE 3D CAMPUSES (one folder each, same files)
    beirut/, byblos/    buildings.js  One entry per building: footprint, floors, roof, colours
                        site.js       Gates, parking, hill, camera, colours
                        geo.js        GPS <-> scene coordinates (each campus has its own origin)
                        osm-surroundings.json  Streets (and neighbouring buildings) from OpenStreetMap
                        byblos/dem.json  NASA SRTM 30 m elevation for Byblos's hillside
    index.js            The list of campuses: getModel('beirut' | 'byblos')
    common.js           Settings shared by every campus (floor height, windows, labels, light/dark scene, night lights)
    geometry.js         Turns a campus's config into 3D shapes (shared by all campuses)
    geo.js              GPS <-> scene coordinates helper
  i18n/
    en.js               All English UI text
    index.jsx           Translation helper (t, localize) + language/RTL setup
  utils/search.js       Search and filter logic
  components/           UI pieces: sidebar (campus switcher, category accordion, place details),
                        floating top buttons (sidebar, search, light/dark), selected-place bar
    campus/             The 3D view: canvas and camera, buildings, site, parking layer, light/dark scene
  theme.js              Light/dark mode (follows the system until the user picks one, then remembers it)
  App.jsx               Holds the app state and puts the components together
  styles.css            All styles
vite.config.js          Build config + PWA (offline / install) settings
```

## Adding or editing places

Open `src/data/places.json` and add an object to the list:

```json
{
  "id": "beirut-printer-library",
  "name": "Library Printer",
  "campus": "beirut",
  "category": "printing",
  "building": "RNL",
  "floor": "1",
  "description": "Black & white and color printing.",
  "hours": "Same as the library",
  "contact": "it@lau.edu.lb",
  "link": "",
  "keywords": ["print", "copy", "scan"]
}
```

- **Required:** `id` (unique), `name`, `campus` (`beirut` / `byblos`), `category`.
- **Optional:** everything else. Empty fields are just hidden.
- **`building`**: the code of the building the place is in. Tapping that building in 3D then lists the place, and the place highlights the building. Codes: `SH` Sage Hall, `NH` Nicol Hall, `IH` Irwin Hall, `ShH` Shannon Hall, `US` University Services, `OG` Orme-Gray, `SFA` Safadi Fine Arts, `GYM` Gymnasium, `WKSC` Student Center, `AKSOB` Adnan Kassar School of Business, `RNL` Riyad Nassar Library, `UGP` Underground Parking, `GB` Gezairi Building.
- **Buildings are places too:** each building has an entry whose `id` is its code. That entry holds the description shown when the building is tapped.
- **Categories:** `acadsvc` (Academic services), `student` (Student life & support), `food`, `study` (Study & library), `sports` (Sports & fitness), `techid` (Tech & ID services), `venues`, `hangout` (Hangout spots), `cats`, `shelters`, `safety` (Assembly points), `buildings`, `parking`. A place can also show up under another category with `"alsoCategories": ["food"]`. Each category is a row in the sidebar accordion; rows with no places are hidden automatically. Row order is `ORDER` in `src/components/CategoryAccordion.jsx`.
- **Shelters** (`shelters`) are underground spaces for emergencies: Safadi Fine Arts, AKSOB and the Library (9 floors underground), Sage Hall and Gezairi. LAU does not publish shelter locations, so these come from the app owner, not from an LAU source. Each has a `position`, `near` and a description; add the number of floors underground to the description (and `subtitle`) where it is known.
- **Assembly points** (`safety`) are the four emergency assembly points on LAU Facilities Management's Beirut Safety Map (last modified 27 May 2019, [PDF](https://fm.lau.edu.lb/documents/campus-safety-plan-beirut.pdf)). Each has a `position` read off that map (`"verified": false`). Re-check them on campus, and against any newer safety plan, before relying on them.
- **Parking** is a category like the others. Each lot is a place with `"category": "parking"`, a `code` (the letter on its pin: M, U, L, G) and either a `building` or a `position`. A parking place with neither has no pin, so give every lot one of them. `subtitle` is the short line under the name in the sidebar. Other places can set `subtitle` too; otherwise it is built from the building and level.
- **`latitude` / `longitude`** (optional) are only used by the Directions button. Places inside a building use the building's coordinates automatically. To get coordinates: in Google Maps, long-press the spot and copy the two numbers (latitude first). Write them as numbers, without quotes.
- `contact` becomes a tappable link if it's an email or phone number.
- `keywords` are extra search words that don't appear in the name, for example "coffee" for a cafeteria.

If you make a mistake (missing field, coordinates in quotes), the app skips that place and tells you why in the browser console (F12 → Console). Unknown categories and building codes are also reported there.

## Adjusting the 3D campus

- **Buildings**: `src/campus/<campus>/buildings.js` (`beirut` or `byblos`), one entry per building. Change `floors`, the footprint corners (metres east/south of the campus centre), `roof`, or the `style`. Colours live in `STYLES` at the top of that file; on Byblos, `level` names the terrace a building stands on and `below` counts the floors under that terrace; the Gezairi Building has its own `gezairi` style, ready to restyle from photos.
- **Facades and roofs**: in `buildings.js`, `STYLES` sets each facade type's colours and windows (`grid`, `ribbon` or `none`); `WINDOWS` (the window size and spacing) and `ROOFS` (the red tile and skylight colours) are shared by all campuses, in `src/campus/common.js`. A part's `roof` can be `flat`, `hip`, `sawtooth` or `courts`.
- **Small details** (Irwin's glass bay, the Library's glass cylinder, rooftop boxes): the `extras` list on a building. The format is explained above `BUILDINGS`.
- **Labels**: `label` gives a shorter name for the floating label, and `labelOffset` moves a label that overlaps another one.
- **Gates, parking lots, trees, terraces, amphitheater, hill, camera, off-screen markers, colours**: `src/campus/<campus>/site.js`. On Byblos the hill is built from `LEVELS` (the height of each terrace), `TERRACES_LEVELLED`, `RAMPS` and the SRTM slope; the sea and old town are `SEA`; extra camera buttons ("Sea view") are `VIEWS`.
- **Hangout spots**: entries in `places.json` with `"category": "hangout"`, a `position` (`[x, z]` in metres, same coordinates as `buildings.js`), `near` (closest building code), `features` (`benches`, `food`, `fountain`, `trees`, `shade`, `cats`) and `verified`. `"verified": false` marks a position that has not been checked on campus (it is only a note for you; the app shows nothing). Their 3D touches (benches, kiosk, fountain, big tree, shrubs) are in `HANGOUT_DECOR` in the campus's `site.js`.
- **Paths and stairs**: `PATHS` and `STAIRS` in the campus's `site.js` (lists of [x, z] points; trees keep clear of them). `PATCHES` are the green garden patches with bushes and flowers.
- **Always on the map**: buildings, paths, benches, the fountain, trees, the cat house and surface parking are always drawn. The toolbar buttons only show or hide the labels and reset the camera. Underground parking outlines appear when the Parking category is open.
- **Light and dark scene**: `SCENE` in `src/campus/common.js` (background, sky, ground and light strengths for each theme).
- **Night lights** (dark theme only): `NIGHT_WINDOWS` in `src/campus/common.js` sets the glow colour and the share of windows that are lit; `LAMPS` sets the lamp posts along the paths (spacing, height, colour, size of the halo and the pool of light).
- **Label crowding**: `labelPriority` on each building (1 = always shown, 2/3 = shown as you zoom in) and the zoom thresholds in `LABELS` in `src/campus/common.js`.
- **Streets and neighbouring buildings**: run `npm run osm` (Beirut) or `npm run osm -- byblos` to re-download them from OpenStreetMap. Byblos draws only the roads; the village houses around it are left out on purpose.

Building outlines and streets come from OpenStreetMap (© OpenStreetMap contributors, ODbL). The credit line in the corner of the 3D view is required by that licence, so keep it.

## Campus facilities (pins on demand)

Facilities (offices, services, food, library zones, sports, venues...) are normal entries in `places.json` with a `building` code, a `level` and a `room`. Extra fields they use:

| Field | What it is |
|---|---|
| `level`, `room` | Where it is inside the building, as text (`"Level 3 (lobby)"`, `"303B"`). Leave empty if unknown: the app shows "Not listed". |
| `hours` | Opening hours as text. If hours can be read from LAU's pages (see below), `src/data/hours.json` takes over. |
| `hoursKey` | Which entry of `hours.json` to use (default: the place's own `id`). `"general"` = typical office hours. |
| `contact` | Parts separated by ` · `, e.g. `"+961 1 786456 ext. 1318 · registrar.beirut@lau.edu.lb"`. Each part becomes a link. |
| `link` | The official page ("Open official page" button). |
| `source`, `sourceDate` | The page the level/room came from, and the date that page says it was updated. |
| `checked` | The day the details were last compared with the source. |
| `note` | Conflicts or doubts, shown in small print (e.g. "LAU's pages disagree about the level"). |
| `verified` | `false` until someone has checked the place on campus. |

**Pins appear only on demand.** Nothing is pinned by default. Picking a place (search, sidebar, map) shows one pin above its building and flies the camera there; its details open in the sidebar (the back arrow returns to the list). Opening a category in the sidebar shows a pin for every place in it, and frames them; opening another category (only one is open at a time) or closing it clears them. Several places in one building share a pin with a count; tapping it opens the building, which lists them by level and room. Hangout spots and the cat area work the same way.

### Opening hours that update themselves

The app can't read LAU's websites itself: they don't send the headers (CORS) browsers need. Instead:

1. `scripts/update-hours.js` (run it with `npm run hours`) downloads the official pages, reads the hours and writes `src/data/hours.json`.
2. `.github/workflows/update-hours.yml` runs that script every Monday on GitHub (free), commits the file if it changed, and Vercel redeploys from the commit. You can also start it by hand from the Actions tab.
3. If a page can't be fetched or its hours can't be found, the **old hours are kept** and marked `"stale": true`; the app then says "may be outdated". Hours are never blanked. Places with no known hours say "Not listed. See the official page."
4. The details sheet shows "Checked <date>" next to the hours.

To track hours for another place, add a function for it to `SOURCES` in `scripts/update-hours.js` and set the same key as `hoursKey` (or the place `id`).

Note: LAU's Cloudflare protection refuses Node's built-in `fetch`, so the script uses `curl` (preinstalled on GitHub's servers).

## Adding a campus

Byblos was added this way, after Beirut:

1. Make `src/campus/<campus>/` with `geo.js` (its GPS origin), `buildings.js`, `site.js` and `osm-surroundings.json`, in the same format as `beirut/`. Shared settings come from `src/campus/common.js`.
2. Register it in `src/campus/index.js` (and in `src/data/places.js`, for the GPS conversion).
3. Add its places to `places.json` with `"campus": "<campus>"`.
4. In `src/data/campuses.js`, set it to `active: true`.

The 3D code (`geometry.js`, `details.js`, `pins.js` and `src/components/campus/`) is shared and never mentions a campus by name: it works from the campus's model. The plan for Byblos, with its sources and guesses, is in `docs/byblos-layout.md`.

Byblos's places (stage 4) are not added yet: until then its sidebar is empty and the 3D model is the block model described in that document.

## Adding Arabic

The UI is ready for right-to-left languages:

1. Copy `src/i18n/en.js` to `src/i18n/ar.js` and translate the values. Keep the keys the same.
2. Register it in `src/i18n/index.jsx`: `ar: { dict: ar, dir: 'rtl', label: 'العربية' }`.
3. Add a language toggle that calls `setLang('ar')` from `useI18n()`.
4. Place fields can be translated in `places.json` by using an object instead of a string:
   `"name": { "en": "Main Cafeteria", "ar": "الكافتيريا الرئيسية" }`. Plain strings keep working.

The CSS uses logical properties (`inline-start`/`inline-end`) rather than left/right, so the layout mirrors itself automatically.

## Offline zip for library laptops (no installation)

```bash
npm run package
```

This builds the app a second time, in a special "offline" mode, and creates **`release/campus-app.zip`** (about 0.35 MB). Copy the zip to a laptop and follow the 3 lines in its README.txt:

1. Unzip it.
2. Double-click `start.bat` (Windows) or `start.command` (Mac).
3. Close the window to stop.

How it works, and what to know:

- **No installation, no administrator rights.** Windows uses PowerShell's built-in web server (`scripts/package/server.ps1`); the Mac uses Perl, which ships with macOS (`server.pl`). Both only listen on the laptop itself (127.0.0.1), pick a free port (starting at 8765), open the browser, and keep running until the window is closed.
- **Fully offline.** The packaging script checks the build and stops if anything would be loaded from the internet (fonts, scripts, maps, CDNs). Only the links you tap (Google Maps directions, LAU pages) need internet.
- **No service worker.** This build has no PWA caching, so an old version can never get stuck in the browser, and it removes any old service worker it finds. The server also tells the browser not to cache anything.
- **Mac warning:** the first time, macOS may block `start.command` because it was downloaded: right-click it and choose Open. Windows may show a "SmartScreen" notice for `start.bat`: choose "More info" > "Run anyway".
- **Opening hours and place details** are the ones in the zip. To update a laptop, build a new zip and replace the folder.
- This does **not** change the website: `npm run build` (what Vercel runs) still produces the installable PWA in `dist/`. The offline version builds into `dist-offline/`, and both folders and `release/` are ignored by git.

## Deploy to Vercel (free)

**Option A: GitHub (recommended, auto-deploys on every push)**

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, and click **Add New → Project**.
3. Import the repo. Vercel detects Vite automatically (build: `npm run build`, output: `dist`). Click **Deploy**.
4. From then on, every `git push` to `main` redeploys the site. Editing `places.json` on GitHub works too.

**Option B: from your computer**

```bash
npm i -g vercel
vercel          # first time: answer the prompts, creates a preview deployment
vercel --prod   # deploy to your production URL
```

After a deploy, phones that already installed the app pick up the new version automatically the next time it's opened online.

## Notes

- The "Directions" button opens Google Maps walking directions as a plain link, so no API key is needed.
- The sample places (Registrar, Health Clinic, Cafeteria, Elevator) use **placeholder details**, and the building descriptions are generic. Replace them with real data.
