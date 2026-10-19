// Bottom sheet showing the details of one place.
import { useEffect } from 'react';
import { getCategory } from '../data/categories.js';
import { useI18n } from '../i18n/index.jsx';
import { PLACES, getPlace, placeCoordinates } from '../data/places.js';

// Turns the "contact" text into a tappable link when it's an email or phone number.
function ContactLink({ value }) {
  if (value.includes('@')) return <a href={`mailto:${value}`}>{value}</a>;
  if (/^\+?[\d\s-]{6,}$/.test(value)) return <a href={`tel:${value.replace(/[\s-]/g, '')}`}>{value}</a>;
  return value;
}

export default function PlaceSheet({ place, onClose, onSelect }) {
  const { t, localize } = useI18n();
  const category = getCategory(place.category);
  const building = place.building ? getPlace(place.building) : null;
  // For a building: the offices, services etc. that list it as their "building".
  const inside = PLACES.filter((p) => p.building === place.id);
  const coords = placeCoordinates(place);

  // Close with the Escape key (handy on desktop).
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Each detail row is only shown if the field has a value.
  const rows = [
    [
      'building',
      building && (
        <button type="button" className="link-button" onClick={() => onSelect(building)}>
          {localize(building.name)}
        </button>
      ),
    ],
    ['floor', localize(place.floor)],
    ['hours', localize(place.hours)],
    ['contact', place.contact && <ContactLink value={place.contact} />],
  ].filter(([, value]) => value);

  const directionsUrl =
    coords && `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${coords[0]},${coords[1]}`;

  return (
    <section className="sheet" role="dialog" aria-labelledby="sheet-title">
      <div className="sheet-header">
        <span className="category-tag" style={{ '--chip-color': category.color }}>
          <span className="dot" />
          {t(`category.${place.category}`)}
        </span>
        <button type="button" className="sheet-close" aria-label={t('close')} onClick={onClose}>
          &times;
        </button>
      </div>

      <h2 id="sheet-title">{localize(place.name)}</h2>
      {place.description && <p className="sheet-desc">{localize(place.description)}</p>}

      <dl className="sheet-details">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {inside.length > 0 && (
        <div className="sheet-inside">
          <h3>{t('insideBuilding')}</h3>
          <ul>
            {inside.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onSelect(p)}>
                  <span className="dot" style={{ background: getCategory(p.category).color }} />
                  {localize(p.name)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sheet-actions">
        {/* Opens the phone's maps app for walking directions. It's just a link, no API key. */}
        {directionsUrl && (
          <a className="button primary" href={directionsUrl} target="_blank" rel="noreferrer">
            {t('directions')}
          </a>
        )}
        {place.link && (
          <a className="button" href={place.link} target="_blank" rel="noreferrer">
            {t('link')}
          </a>
        )}
      </div>
    </section>
  );
}
