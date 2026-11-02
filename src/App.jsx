// Top-level component: holds the app state and lays out the screen.
//
//   sidebar      campus switcher + accordion of categories (and the details of a picked place)
//   map          the 3D campus, with pins for the open category or the picked place
//   top buttons  sidebar, search and light/dark buttons floating over the map
import { lazy, memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PLACES } from './data/places.js';
import { CAMPUSES, DEFAULT_CAMPUS } from './data/campuses.js';
import { inCategory } from './data/categories.js';
import { useI18n } from './i18n/index.jsx';
import { filterPlaces } from './utils/search.js';
import { useTheme } from './theme.js';
import Sidebar from './components/Sidebar.jsx';
import TopControls from './components/TopControls.jsx';
import SelectedBar from './components/SelectedBar.jsx';

// The 3D view (and the Three.js library) is loaded separately, so the sidebar
// shows up right away while it downloads.
// memo: opening or closing the sidebar must not re-render the whole 3D scene.
const CampusView = lazy(() => import('./components/campus/CampusView.jsx').then((mod) => ({ default: memo(mod.default) })));

const NONE = []; // a campus that isn't on screen shows no pins
const isNarrow = () => window.matchMedia('(max-width: 719px)').matches;

export default function App() {
  const { t, localize } = useI18n();
  const [theme, toggleTheme] = useTheme();

  const [campus, setCampus] = useState(DEFAULT_CAMPUS);
  // Every campus gets its own 3D scene, built once and then kept (the first at start, the others once the browser is idle), so
  // switching campus just shows the other one. `ready` = the scenes that have drawn their first frame.
  const [mounted, setMounted] = useState([DEFAULT_CAMPUS]);
  const [ready, setReady] = useState([]);
  const [openCategory, setOpenCategory] = useState(null); // the open accordion row (one at a time)
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null); // { id, n }: asks the map to fly to a place
  // Sidebar: open by default on wide screens, closed on phones (where it covers the map).
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const campusPlaces = useMemo(() => PLACES.filter((p) => p.campus === campus), [campus]);
  const placesByCampus = useMemo(() => Object.fromEntries(CAMPUSES.map((c) => [c.id, PLACES.filter((p) => p.campus === c.id)])), []);
  const categoryPlaces = useMemo(
    () => (openCategory ? campusPlaces.filter((p) => inCategory(p, openCategory)) : []),
    [campusPlaces, openCategory]
  );
  const selectedPlace = campusPlaces.find((p) => p.id === selectedId) ?? null;
  const results = useMemo(
    () => (query.trim() ? filterPlaces(PLACES, { campus, category: null, query, localize, t }) : []),
    [campus, query, localize, t]
  );

  // Picking a place (from the sidebar, the search, or the map): show its details in the sidebar.
  // `fly` moves the camera to it; tapping a building on the map doesn't need that.
  const select = useCallback((place, { fly = true } = {}) => {
    setSelectedId(place.id);
    setSidebarOpen(true);
    if (fly) setFocus((f) => ({ id: place.id, n: (f?.n ?? 0) + 1 }));
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
  }, []);

  const pickFromSearch = (place) => {
    closeSearch();
    select(place);
  };

  const changeCampus = (id) => {
    if (id === campus) return;
    setCampus(id);
    setSelectedId(null);
    setOpenCategory(null);
    setMounted((list) => (list.includes(id) ? list : [...list, id])); // (normally built already, see below)
  };
  const readyHandlers = useMemo(() => Object.fromEntries(CAMPUSES.map((c) => [c.id, () => setReady((list) => (list.includes(c.id) ? list : [...list, c.id]))])), []);
  // The other campuses are built once the first scene is on screen and the browser has nothing better to do.
  useEffect(() => {
    if (!ready.length) return undefined;
    const rest = CAMPUSES.filter((c) => c.active && !mounted.includes(c.id)).map((c) => c.id);
    if (!rest.length) return undefined;
    const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 600));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => setMounted((list) => [...list, ...rest.filter((id) => !list.includes(id))]), { timeout: 4000 });
    return () => cancel(handle);
  }, [ready, mounted]);
  const veil = !ready.includes(campus); // the scene on screen has not drawn yet (first load, or a switch before the other campus was built)

  // The map slides into its new place when the sidebar opens or closes (see .map-in and .map-out in styles.css). The map itself is
  // resized once, at the start: animating its size would redraw the whole 3D scene on every frame.
  const [mapShift, setMapShift] = useState(null);
  const firstRender = useRef(true);
  useLayoutEffect(() => {
    if (firstRender.current) { firstRender.current = false; return undefined; }
    setMapShift(sidebarOpen ? 'in' : 'out');
    const id = setTimeout(() => setMapShift(null), 450);
    return () => clearTimeout(id);
  }, [sidebarOpen]);

  const sidebarOpenRef = useRef(sidebarOpen);
  sidebarOpenRef.current = sidebarOpen;
  const onMapSelect = useCallback((place) => select(place, { fly: false }), [select]);
  const onMapBackground = useCallback(() => { if (!sidebarOpenRef.current) setSelectedId(null); }, []);

  // Escape: close the search first, then the details, then (on phones) the drawer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (searchOpen) closeSearch();
      else if (selectedId && sidebarOpen) setSelectedId(null);
      else if (sidebarOpen && isNarrow()) setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, selectedId, sidebarOpen, closeSearch]);

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''} ${mapShift ? `map-${mapShift}` : ''}`}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        campus={campus}
        onCampus={changeCampus}
        places={campusPlaces}
        openCategory={openCategory}
        onToggleCategory={(id) => setOpenCategory((open) => (open === id ? null : id))}
        selectedPlace={selectedPlace}
        onSelect={select}
        onBack={() => setSelectedId(null)}
      />

      {/* On phones the sidebar is a drawer: tapping the dimmed map closes it. */}
      <div className="backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

      <main className="content">
        <Suspense
          fallback={
            <div className="campus-loading" role="status">
              <span className="spinner" aria-hidden="true" />
              {t('loading3d')}
            </div>
          }
        >
          {/* One 3D scene per campus (src/campus/index.js), all kept; only the current campus is shown and draws. */}
          {mounted.map((id) => {
            const active = id === campus;
            return (
              <div key={id} className={`scene ${active ? 'active' : ''}`} aria-hidden={!active}>
                <CampusView
                  campus={id}
                  active={active}
                  places={active ? categoryPlaces : NONE}
                  allPlaces={placesByCampus[id]}
                  category={active ? openCategory : null}
                  selectedPlace={active ? selectedPlace : null}
                  focus={focus}
                  theme={theme}
                  onSelect={onMapSelect}
                  onBackgroundClick={onMapBackground}
                  onReady={readyHandlers[id]}
                />
              </div>
            );
          })}
        </Suspense>

        <div className={`campus-veil ${veil ? 'on' : ''}`} aria-hidden="true">
          <span className="spinner" />
        </div>

        <TopControls
          sidebarOpen={sidebarOpen}
          onMenu={() => setSidebarOpen((open) => !open)}
          theme={theme}
          onToggleTheme={toggleTheme}
          search={{ open: searchOpen, onOpen: () => setSearchOpen(true), onClose: closeSearch, query, onQuery: setQuery, results, onPick: pickFromSearch }}
        />

        <SelectedBar place={selectedPlace} visible={Boolean(selectedPlace) && !sidebarOpen} onOpen={() => setSidebarOpen(true)} onClear={() => setSelectedId(null)} />
      </main>
    </div>
  );
}
