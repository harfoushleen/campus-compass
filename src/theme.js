// Light / dark theme.
//   - Starts with the phone's or computer's own setting, and keeps following it until
//     the user picks a theme with the sun/moon button.
//   - After that, the user's choice is remembered on this device (localStorage).
//   - The theme is applied as <html data-theme="light|dark">, which switches the colour
//     variables in styles.css. (index.html applies it before the page draws, so there is no
//     flash of the wrong theme.)
//   - Switching fades all colours smoothly (the "theme-fade" class in styles.css), unless the
//     user has "reduce motion" turned on.
import { useEffect, useState } from 'react';

const KEY = 'campus-theme';
const THEME_COLORS = { light: '#e9efeb', dark: '#1b2321' }; // browser toolbar colour on phones
const dark = () => window.matchMedia?.('(prefers-color-scheme: dark)');

function savedTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // storage can be blocked (private windows); just fall through
  }
  return null;
}

/** Returns [theme, toggleTheme]. */
export function useTheme() {
  const [theme, setTheme] = useState(() => savedTheme() ?? (dark()?.matches ? 'dark' : 'light'));

  // Apply it to the page.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  // Follow the system setting while the user hasn't chosen one.
  useEffect(() => {
    const query = dark();
    if (!query) return undefined;
    const onChange = (e) => {
      if (!savedTheme()) setTheme(e.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    root.classList.add('theme-fade'); // fade the colours for a moment
    window.setTimeout(() => root.classList.remove('theme-fade'), 450);
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(KEY, next); // from now on, the user's choice
      } catch {
        // ignore
      }
      return next;
    });
  };

  return [theme, toggle];
}
