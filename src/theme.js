// Light / dark theme. The choice is remembered on this device (localStorage) and
// defaults to the phone's or computer's own setting. The theme is applied as
// <html data-theme="light|dark">, which switches the colour variables in styles.css.
// (index.html applies it before the page draws, so there's no flash of the wrong theme.)
import { useEffect, useState } from 'react';

const KEY = 'campus-theme';
const THEME_COLORS = { light: '#e9efeb', dark: '#222b28' }; // browser toolbar colour on phones

function initialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // storage can be blocked (private windows); just fall through
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Returns [theme, toggleTheme]. */
export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}
