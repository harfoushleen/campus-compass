// The sidebar: campus switcher on top, then either the accordion of categories or, once a place
// is picked, that place's details (with a back arrow). On wide screens it pushes the map aside;
// on phones it is a drawer over the map (tap outside to close).
import { useRef } from 'react';
import { useI18n } from '../i18n/index.jsx';
import CampusSwitcher from './CampusSwitcher.jsx';
import CategoryAccordion from './CategoryAccordion.jsx';
import PlaceDetails from './PlaceDetails.jsx';
import { CloseIcon } from './icons.jsx';

export default function Sidebar({ open, onClose, campus, onCampus, places, openCategory, onToggleCategory, selectedPlace, onSelect, onBack }) {
  const { t } = useI18n();
  // Keep showing the last place while the details slide out, so the content doesn't vanish mid-slide.
  const lastPlace = useRef(null);
  if (selectedPlace) lastPlace.current = selectedPlace;
  const shown = selectedPlace ?? lastPlace.current;

  return (
    // `inert` keeps a closed panel out of reach of the keyboard and screen readers.
    <aside className="sidebar" id="sidebar" inert={!open} aria-label={t('appName')}>
      <header className="sb-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <h1>{t('appName')}</h1>
        </div>
        <button type="button" className="round-btn sb-close" onClick={onClose} aria-label={t('closeMenu')} title={t('closeMenu')}>
          <CloseIcon />
        </button>
      </header>

      <CampusSwitcher value={campus} onChange={onCampus} />

      <div className={`sb-views ${selectedPlace ? 'show-details' : ''}`}>
        <div className="sb-view sb-list" inert={Boolean(selectedPlace)}>
          <CategoryAccordion places={places} openId={openCategory} onToggle={onToggleCategory} selectedId={selectedPlace?.id} onSelect={onSelect} />
        </div>
        <div className="sb-view sb-details" inert={!selectedPlace}>
          {shown && <PlaceDetails key={shown.id} place={shown} onBack={onBack} onSelect={onSelect} />}
        </div>
      </div>
    </aside>
  );
}
