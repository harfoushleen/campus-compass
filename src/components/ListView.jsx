// Scrollable list of places, an alternative to the map.
import { CategoryBadge } from './CategoryIcon.jsx';
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
              <CategoryBadge id={place.category} />
              <span className="result-text">
                <strong>{localize(place.name)}</strong>
                <small>
                  {t(`category.${place.category}`)}
                  {place.building && ` · ${localize(getPlace(place.building)?.name)}`}
                  {place.near && ` · ${t('near')} ${localize(getPlace(place.near)?.name)}`}
                  {place.level && ` · ${localize(place.level)}`}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
