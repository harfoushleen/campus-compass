// Bottom sheet showing the details of one place.
import { useEffect } from 'react';
import { getCategory } from '../data/categories.js';
import { useI18n } from '../i18n/index.jsx';
import { PLACES, getPlace, placeCoordinates } from '../data/places.js';
import { getHours } from '../data/hours.js';
import { CategoryBadge } from './CategoryIcon.jsx';

const MAIN_PHONE = '+961 1 786456';

// One contact part: an email, a phone number with an extension, or plain text.
function ContactPart({ value }) {
  const v = value.trim();
  if (v.includes('@')) return <a href={`mailto:${v}`}>{v}</a>;
  const ext = v.match(/^\+961 1 786456 ext\. ?(\d+)/);
  if (ext) return <a href={`tel:${MAIN_PHONE.replace(/\s/g, '')},${ext[1]}`}>{v}</a>; // "," = pause, then dial the extension
  if (/^\+?[\d\s-]{6,}$/.test(v)) return <a href={`tel:${v.replace(/[\s-]/g, '')}`}>{v}</a>;
  return v;
}

// The "contact" field can hold several parts, separated by " · ".
function Contact({ value }) {
  return (
    <span className="contact-list">
      {value.split(' · ').map((part) => (
        <span key={part}>
          <ContactPart value={part} />
        </span>
      ))}
    </span>
  );
}

// "2021-07-26" -> "26 Jul 2021". Anything else (a year, "undated") is shown as it is.
const formatDate = (s) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s ?? '') ? new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : s;

// Sort key for "Level 4", "Ground floor", "Levels 8, 10 and 11"...
const levelOrder = (level) => (/ground|street/i.test(level ?? '') ? 0 : parseInt((level ?? '').match(/\d+/)?.[0] ?? '99', 10));

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export default function PlaceSheet({ place, onClose, onSelect }) {
  const { t, localize } = useI18n();
  const category = getCategory(place.category);
  const building = place.building ? getPlace(place.building) : null;
  const near = place.near ? getPlace(place.near) : null; // hangout spots: the closest building
  // For a building: the places that list it as their "building", by level.
  const inside = PLACES.filter((p) => p.building === place.id).sort((a, b) => levelOrder(a.level) - levelOrder(b.level));
  const coords = placeCoordinates(place);
  const isFacility = Boolean(place.building); // sits inside a building: always show an hours line
  const hours = getHours(place);

  // Close with the Escape key (handy on desktop).
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hoursRow =
    hours ? (
      <>
        <span>{localize(hours.text)}</span>
        <small className="hours-meta">
          {hours.checked && t('hoursChecked', { date: formatDate(hours.checked) })}
          {hours.stale && ` · ${t('hoursStale')}`}
        </small>
      </>
    ) : isFacility ? (
      <span className="muted">{t('hoursUnknown')}</span>
    ) : null;

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
    [
      'near',
      near && (
        <button type="button" className="link-button" onClick={() => onSelect(near)}>
          {localize(near.name)}
        </button>
      ),
    ],
    ['level', localize(place.level) || (isFacility && <span className="muted">{t('notListed')}</span>)],
    ['room', place.room || (isFacility && <span className="muted">{t('notListed')}</span>)],
    [
      'features',
      place.features?.length > 0 && (
        <span className="feature-list">
          {place.features.map((f) => (
            <span key={f} className="feature">{t(`feature.${f}`)}</span>
          ))}
        </span>
      ),
    ],
    ['hours', hoursRow],
    ['contact', place.contact && <Contact value={place.contact} />],
  ].filter(([, value]) => value);

  const directionsUrl =
    coords && `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${coords[0]},${coords[1]}`;

  return (
    <section className="sheet" role="dialog" aria-labelledby="sheet-title">
      <div className="sheet-header">
        <span className="category-tag">
          <CategoryBadge id={place.category} />
          {t(`category.${place.category}`)}
        </span>
        <button type="button" className="sheet-close" aria-label={t('close')} onClick={onClose}>
          &times;
        </button>
      </div>

      <h2 id="sheet-title">{localize(place.name)}</h2>
      {place.description && <p className="sheet-desc">{localize(place.description)}</p>}
      {place.verified === false && <p className="sheet-note">{place.position ? t('notVerified') : t('notVerifiedInfo')}</p>}

      <dl className="sheet-details">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {place.note && <p className="sheet-fineprint">{t('noteLabel')}: {place.note}</p>}

      {inside.length > 0 && (
        <div className="sheet-inside">
          <h3>{t('insideBuilding')}</h3>
          <ul>
            {inside.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onSelect(p)}>
                  <CategoryBadge id={p.category} />
                  <span className="result-text">
                    <strong>{localize(p.name)}</strong>
                    <small>{[localize(p.level), p.room && `${t('room')} ${p.room}`].filter(Boolean).join(' · ')}</small>
                  </span>
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
            {place.source ? t('officialPage') : t('link')}
          </a>
        )}
      </div>

      {place.source && (
        <p className="sheet-fineprint">
          {place.checked && `${t('lastChecked', { date: formatDate(place.checked) })} · `}
          {place.sourceDate !== place.checked && `${t('sourceUpdated', { date: formatDate(place.sourceDate) })} · `}
          <a href={place.source} target="_blank" rel="noreferrer">{hostOf(place.source)}</a>
        </p>
      )}
    </section>
  );
}
