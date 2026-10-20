// Side panel holding the campus switcher, search and filters. It slides in from the
// start edge (left, or right in Arabic) and can be closed to leave just the map.
// The button that opens it again is in App.jsx.
import { useI18n } from '../i18n/index.jsx';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export default function Sidebar({ open, onClose, theme, onToggleTheme, children }) {
  const { t } = useI18n();
  return (
    // `inert` keeps a closed panel out of reach of the keyboard and screen readers.
    <aside className="sidebar" id="sidebar" inert={!open} aria-label={t('appName')}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">{t('appName')}</h1>
        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? t('themeToLight') : t('themeToDark')}
          title={theme === 'dark' ? t('themeToLight') : t('themeToDark')}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <button type="button" className="icon-button" onClick={onClose} aria-label={t('closeMenu')} title={t('closeMenu')} aria-controls="sidebar">
          <ChevronIcon />
        </button>
      </div>
      {children}
    </aside>
  );
}
