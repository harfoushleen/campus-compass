// Scrollable list of places, an alternative to the map.
import { getCategory } from '../data/categories.js';
import { useI18n } from '../i18n/index.jsx';
import { getPlace } from '../data/places.js';

export default function ListView({ places, onSelect }) {
  const { t, localize } = useI18n();

  if (places.length === 0) return <p className="list-empty">{t('noResults')}</p>;

  return (
    <div className="list">
      <p className="list-count">{t('resultsCount', { count: places.length })}</p>
      <ul>
        {places.map((place) => (
          <li key={place.id}>
            <button type="button" onClick={() => onSelect(place)}>
              <span className="dot" style={{ background: getCategory(place.category).color }} />
              <span className="result-text">
                <strong>{localize(place.name)}</strong>
                <small>
                  {t(`category.${place.category}`)}
                  {place.building && ` · ${localize(getPlace(place.building)?.name)}`}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
