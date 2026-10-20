// Top-level component: holds the app state and lays out the screen.
import { lazy, Suspense, useMemo, useState } from 'react';
import { PLACES } from './data/places.js';
import { DEFAULT_CAMPUS } from './data/campuses.js';
import { useI18n } from './i18n/index.jsx';
import { filterPlaces } from './utils/search.js';
import CampusSwitcher from './components/CampusSwitcher.jsx';
import SearchBar from './components/SearchBar.jsx';
import CategoryChips from './components/CategoryChips.jsx';
import ViewToggle from './components/ViewToggle.jsx';
import Sidebar from './components/Sidebar.jsx';
import { useTheme } from './theme.js';
// The 3D view (and the Three.js library) is loaded separately, so the search bar,
// chips and list show up right away while it downloads.
const CampusView = lazy(() => import('./components/campus/CampusView.jsx'));
import ListView from './components/ListView.jsx';
import PlaceSheet from './components/PlaceSheet.jsx';

export default function App() {
  const { t, localize } = useI18n();

  const [campus, setCampus] = useState(DEFAULT_CAMPUS);
  const [category, setCategory] = useState(null); // null = all categories
  const [query, setQuery] = useState('');
  const [view, setView] = useState('map'); // 'map' | 'list'
  const [selectedId, setSelectedId] = useState(null);

  // Side panel: open by default on wide screens, closed on phones (it would cover the map).
  const isNarrow = () => window.matchMedia('(max-width: 719px)').matches;
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow());
  const [theme, toggleTheme] = useTheme();

  // Places that match the current campus, category chip and search text.
  const visiblePlaces = useMemo(
    () => filterPlaces(PLACES, { campus, category, query, localize, t }),
    [campus, category, query, localize, t]
  );

  const campusPlaces = useMemo(() => PLACES.filter((p) => p.campus === campus), [campus]);
  // Categories that have places on this campus (empty chips are hidden).
  const availableCategories = useMemo(
    () => new Set(campusPlaces.flatMap((p) => [p.category, ...(p.alsoCategories ?? [])])),
    [campusPlaces]
  );
  const selectedPlace = PLACES.find((p) => p.id === selectedId) ?? null;
  const selectPlace = (place) => setSelectedId(place.id);

  const changeCampus = (id) => {
    setCampus(id);
    setSelectedId(null);
  };

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} onToggleTheme={toggleTheme}>
        <CampusSwitcher value={campus} onChange={changeCampus} />
        <ViewToggle value={view} onChange={setView} />
        <SearchBar
          value={query}
          onChange={setQuery}
          // Show matching places under the search box on the map view only; the list view is already a result list.
          results={view === 'map' && query ? visiblePlaces : null}
          onSelect={(place) => {
            selectPlace(place);
            if (isNarrow()) setSidebarOpen(false); // on phones, make room for the details sheet
          }}
        />
        <CategoryChips value={category} onChange={setCategory} available={availableCategories} />
      </Sidebar>

      {/* Opens the side panel again once it has been closed. */}
      {!sidebarOpen && (
        <button type="button" className="menu-button" onClick={() => setSidebarOpen(true)} aria-label={t('openMenu')} aria-controls="sidebar" title={t('openMenu')}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      <main className="content">
        {view === 'map' ? (
          // Only Beirut has a 3D model so far; Byblos is "coming soon" in the switcher.
          <Suspense
            fallback={
              <div className="campus-loading" role="status">
                <span className="spinner" aria-hidden="true" />
                {t('loading3d')}
              </div>
            }
          >
            <CampusView
              places={visiblePlaces}
              allPlaces={campusPlaces}
              category={category}
              selectedPlace={selectedPlace}
              onSelect={selectPlace}
              onBackgroundClick={() => setSelectedId(null)}
            />
          </Suspense>
        ) : (
          <ListView places={visiblePlaces} onSelect={selectPlace} />
        )}
      </main>

      {selectedPlace && (
        <PlaceSheet place={selectedPlace} onClose={() => setSelectedId(null)} onSelect={selectPlace} />
      )}
    </div>
  );
}
