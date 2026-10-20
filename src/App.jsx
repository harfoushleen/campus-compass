// Top-level component: holds the app state and lays out the screen.
//
//   sidebar      campus switcher + accordion of categories (and the details of a picked place)
//   map          the 3D campus, with pins for the open category or the picked place
//   top buttons  sidebar, search and light/dark buttons floating over the map
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { PLACES } from './data/places.js';
import { DEFAULT_CAMPUS } from './data/campuses.js';
import { inCategory } from './data/categories.js';
import { useI18n } from './i18n/index.jsx';
import { filterPlaces } from './utils/search.js';
import { useTheme } from './theme.js';
import Sidebar from './components/Sidebar.jsx';
import TopControls from './components/TopControls.jsx';
import SelectedBar from './components/SelectedBar.jsx';

// The 3D view (and the Three.js library) is loaded separately, so the sidebar
// shows up right away while it downloads.
const CampusView = lazy(() => import('./components/campus/CampusView.jsx'));

const isNarrow = () => window.matchMedia('(max-width: 719px)').matches;

export default function App() {
  const { t, localize } = useI18n();
  const [theme, toggleTheme] = useTheme();

  const [campus, setCampus] = useState(DEFAULT_CAMPUS);
  const [openCategory, setOpenCategory] = useState(null); // the open accordion row (one at a time)
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null); // { id, n }: asks the map to fly to a place
  // Sidebar: open by default on wide screens, closed on phones (where it covers the map).
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const campusPlaces = useMemo(() => PLACES.filter((p) => p.campus === campus), [campus]);
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
    setCampus(id);
    setSelectedId(null);
    setOpenCategory(null);
  };

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
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''}`}>
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
          {/* Only Beirut has a 3D model so far; Byblos is "coming soon" in the switcher. */}
          <CampusView
            places={categoryPlaces}
            allPlaces={campusPlaces}
            category={openCategory}
            selectedPlace={selectedPlace}
            focus={focus}
            theme={theme}
            onSelect={(place) => select(place, { fly: false })}
            onBackgroundClick={() => !sidebarOpen && setSelectedId(null)}
          />
        </Suspense>

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
