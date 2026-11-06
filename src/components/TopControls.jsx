// The buttons floating at the top of the map: the sidebar button, a search button that expands
// into a search bar (with results in a dropdown), the light/dark button and the info (credits) button.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/index.jsx';
import { placeSubtitle } from '../data/places.js';
import { ABOUT, CREDITS } from '../data/credits.js';
import lauLogo from '../assets/lau-logo.png';
import { CategoryBadge } from './CategoryIcon.jsx';
import { CloseIcon, InfoIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from './icons.jsx';

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

// The "i" button: opens the Credits panel (who made the app) at the side of the map.
function CreditsDialog({ open, onClose }) {
  const { t } = useI18n();
  const cardRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    // Tapping outside closes it (the "i" button itself toggles, so it is left alone).
    const onPointerDown = (e) => {
      if (!cardRef.current?.contains(e.target) && !e.target.closest?.('.info-box')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="credits-overlay">
      <div className={`credits-card ${open ? '' : 'closing'}`} ref={cardRef} role="dialog" aria-label={t('creditsTitle')}>
        <header className="credits-head">
          <img className="credits-logo" src={lauLogo} alt="Lebanese American University" width="110" height="35" />
          <button type="button" className="credits-close" onClick={onClose} aria-label={t('closeSearch')} title={t('closeSearch')}>
            <CloseIcon size={16} />
          </button>
          <p className="credits-eyebrow">University Libraries · Creative Space</p>
          <h2 className="credits-title">
            <strong>LAURA</strong> UNIT
          </h2>
          <p className="credits-about">{ABOUT}</p>
        </header>

        <div className="credits-body">
          {CREDITS.map((c) => (
            <section key={c.name} className="credits-item">
              <h3>{c.label}</h3>
              <p className="credits-name">{c.name}</p>
              {c.lines.map((line) => (
                <p key={line} className="credits-line">{line}</p>
              ))}
            </section>
          ))}
        </div>

        <footer className="credits-foot">
          <p className="credits-foot-name">LAU Libraries – Creative Space</p>
          <p>Lebanese American University</p>
          <p className="credits-line">© {new Date().getFullYear()} Lebanese American University. All Rights Reserved.</p>
          <p className="credits-line">
            Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
          </p>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function InfoButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // stays mounted for the slide-out animation
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (open) {
      setShown(true);
      return undefined;
    }
    const id = window.setTimeout(() => setShown(false), 240);
    return () => window.clearTimeout(id);
  }, [open]);
  return (
    <div className="info-box">
      <button type="button" className="fab" onClick={() => setOpen((v) => !v)} aria-label={t('info')} title={t('info')} aria-expanded={open}>
        <InfoIcon />
      </button>
      {(open || shown) && <CreditsDialog open={open} onClose={close} />}
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

      <InfoButton />
    </div>
  );
}
