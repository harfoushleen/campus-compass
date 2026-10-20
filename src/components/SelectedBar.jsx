// A small card at the bottom of the map that shows the picked place while the sidebar is closed
// (for example on a phone, after closing the drawer to look at the pin). Tap it to open the details again.
import { useRef } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { placeSubtitle } from '../data/places.js';
import { CategoryBadge } from './CategoryIcon.jsx';
import { CloseIcon, ForwardIcon } from './icons.jsx';

export default function SelectedBar({ place, visible, onOpen, onClear }) {
  const { t, localize } = useI18n();
  const last = useRef(null);
  if (place) last.current = place;
  const shown = place ?? last.current;
  if (!shown) return null;
  return (
    <div className={`selected-bar ${visible ? 'show' : ''}`} inert={!visible}>
      <button type="button" className="selected-main" onClick={onOpen}>
        <CategoryBadge id={shown.category} />
        <span className="place-text">
          <strong>{localize(shown.name)}</strong>
          <small>{placeSubtitle(shown, t)}</small>
        </span>
        <span className="selected-more">
          {t('showDetails')} <ForwardIcon size={16} />
        </span>
      </button>
      <button type="button" className="round-btn small" onClick={onClear} aria-label={t('clearSelection')} title={t('clearSelection')}>
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
