// Search input. When `results` is passed (map view), matching places are listed
// in a dropdown under the input; tapping one opens its details.
import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { CategoryBadge } from './CategoryIcon.jsx';
import { getPlace } from '../data/places.js';

export default function SearchBar({ value, onChange, results, onSelect }) {
  const { t, localize } = useI18n();
  const [open, setOpen] = useState(false);
  const showDropdown = open && results;

  return (
    <div className="search">
      <input
        type="search"
        value={value}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Small delay so a tap on a result registers before the dropdown closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {showDropdown && (
        <ul className="search-results">
          {results.length === 0 && <li className="empty">{t('noResults')}</li>}
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(place);
                  setOpen(false);
                }}
              >
                <CategoryBadge id={place.category} />
                <span className="result-text">
                  <strong>{localize(place.name)}</strong>
                  <small>{place.building ? localize(getPlace(place.building)?.name) : t(`category.${place.category}`)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
