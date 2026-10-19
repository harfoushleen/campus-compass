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

  // Places that match the current campus, category chip and search text.
  const visiblePlaces = useMemo(
    () => filterPlaces(PLACES, { campus, category, query, localize, t }),
    [campus, category, query, localize, t]
  );

  const campusPlaces = useMemo(() => PLACES.filter((p) => p.campus === campus), [campus]);
  const selectedPlace = PLACES.find((p) => p.id === selectedId) ?? null;
  const selectPlace = (place) => setSelectedId(place.id);

  const changeCampus = (id) => {
    setCampus(id);
    setSelectedId(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <CampusSwitcher value={campus} onChange={changeCampus} />
          <ViewToggle value={view} onChange={setView} />
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          // Show a results dropdown on the map view only; the list view is already a result list.
          results={view === 'map' && query ? visiblePlaces : null}
          onSelect={selectPlace}
        />
        <CategoryChips value={category} onChange={setCategory} />
      </header>

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
