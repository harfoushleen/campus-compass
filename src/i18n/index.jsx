// Tiny translation helper – no library needed.
//   const { t, localize } = useI18n();
//   t('close')                      -> "Close"
//   t('resultsCount', { count: 3 }) -> "3 places"  (uses resultsCount.one / .other)
//   localize(place.name)            -> works with "Library" or { "en": "Library", "ar": "المكتبة" }
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';

// Register languages here. `dir: 'rtl'` flips the whole layout for Arabic.
// Example once ar.js exists:  ar: { dict: ar, dir: 'rtl', label: 'العربية' },
export const LANGUAGES = {
  en: { dict: en, dir: 'ltr', label: 'English' },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en');
  const { dict, dir } = LANGUAGES[lang];

  // Keep <html lang dir> in sync so the browser and CSS know the text direction.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const value = useMemo(() => {
    const plurals = new Intl.PluralRules(lang);
    const t = (key, vars = {}) => {
      // If a count is given, pick the right plural form, e.g. "resultsCount.one".
      if (typeof vars.count === 'number') {
        const pluralKey = `${key}.${plurals.select(vars.count)}`;
        if (dict[pluralKey] ?? en[pluralKey]) key = pluralKey;
        else if (dict[`${key}.other`] ?? en[`${key}.other`]) key = `${key}.other`;
      }
      const text = dict[key] ?? en[key] ?? key; // fall back to English, then the key
      return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
    };
    const localize = (field) =>
      field && typeof field === 'object' ? field[lang] ?? field.en ?? '' : field ?? '';
    return { lang, dir, setLang, t, localize };
  }, [lang, dir, dict]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
