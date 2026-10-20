// The buttons floating at the top of the map: the sidebar button, a search button that expands
// into a search bar (with results in a dropdown), and the light/dark button.
import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { placeSubtitle } from '../data/places.js';
import { CategoryBadge } from './CategoryIcon.jsx';
import { CloseIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from './icons.jsx';

function SearchBox({ open, onOpen, onClose, query, onQuery, results, onPick }) {
  const { t, localize } = useI18n();
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // When it opens, put the cursor in the box (after the short expanding animation starts).
  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open]);

  // Tapping anywhere outside the search closes it.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!boxRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onClose]);

  const hasQuery = query.trim().length > 0;
  return (
    <div className={`search-box ${open ? 'open' : ''}`} ref={boxRef} role="search">
      <div className="search-bar">
        <button
          type="button"
          className="fab search-fab"
          aria-label={t('search')}
          title={t('search')}
          aria-expanded={open}
          onClick={() => (open ? inputRef.current?.focus() : onOpen())}
        >
          <SearchIcon />
        </button>
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          value={query}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          tabIndex={open ? 0 : -1}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && results[0] && onPick(results[0])}
        />
        <button type="button" className="search-close" tabIndex={open ? 0 : -1} aria-label={t('closeSearch')} title={t('closeSearch')} onClick={onClose}>
          <CloseIcon size={18} />
        </button>
      </div>

      {open && hasQuery && (
        <ul className="search-results" role="listbox">
          {results.length === 0 && <li className="empty">{t('noResults')}</li>}
          {results.slice(0, 30).map((place) => (
            <li key={place.id}>
              <button type="button" role="option" className="place-row" onClick={() => onPick(place)}>
                <CategoryBadge id={place.category} />
                <span className="place-text">
                  <strong>{localize(place.name)}</strong>
                  <small>{placeSubtitle(place, t) || t(`category.${place.category}`)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TopControls({ sidebarOpen, onMenu, theme, onToggleTheme, search }) {
  const { t } = useI18n();
  const label = theme === 'dark' ? t('themeToLight') : t('themeToDark');
  return (
    <div className={`topbar ${search.open ? 'search-open' : ''}`}>
      <button type="button" className="fab" onClick={onMenu} aria-label={sidebarOpen ? t('closeMenu') : t('openMenu')} title={sidebarOpen ? t('closeMenu') : t('openMenu')} aria-controls="sidebar" aria-expanded={sidebarOpen}>
        <MenuIcon />
      </button>

      <SearchBox {...search} />

      <button type="button" className="fab fab-theme" onClick={onToggleTheme} aria-label={label} title={label}>
        {/* Both icons are there; the one for the other theme fades and turns in. */}
        <span className={`theme-icon ${theme === 'dark' ? 'on' : ''}`}><SunIcon /></span>
        <span className={`theme-icon ${theme === 'light' ? 'on' : ''}`}><MoonIcon /></span>
      </button>
    </div>
  );
}
