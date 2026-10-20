// The details of one place, shown inside the sidebar (with a back arrow to return to the list).
// For a building it also lists the places inside it, grouped by level.
import { useI18n } from '../i18n/index.jsx';
import { PLACES, getPlace, levelOrder, placeCoordinates, placeSubtitle } from '../data/places.js';
import { getHours } from '../data/hours.js';
import { CategoryBadge } from './CategoryIcon.jsx';
import { BackIcon } from './icons.jsx';

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

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** Places inside a building, grouped by level: [{ level, places: [...] }, ...] from the lowest level up. */
export function placesByLevel(buildingId) {
  const groups = new Map();
  for (const p of PLACES.filter((x) => x.building === buildingId)) {
    const key = p.level || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return [...groups.entries()]
    .sort((a, b) => levelOrder(a[0]) - levelOrder(b[0]))
    .map(([level, places]) => ({ level, places: places.sort((a, b) => a.name.localeCompare(b.name)) }));
}

export default function PlaceDetails({ place, onBack, onSelect }) {
  const { t, localize } = useI18n();
  const building = place.building ? getPlace(place.building) : null;
  const near = place.near ? getPlace(place.near) : null; // hangout spots: the closest building
  const groups = placesByLevel(place.id);
  const coords = placeCoordinates(place);
  const isFacility = Boolean(place.building); // sits inside a building: always show an hours line
  const hours = getHours(place);

  const hoursRow = hours ? (
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
    <article className="details" aria-labelledby="place-title">
      <div className="details-top">
        <button type="button" className="round-btn" onClick={onBack} aria-label={t('back')} title={t('back')}>
          <BackIcon />
        </button>
        <span className="category-tag">
          <CategoryBadge id={place.category} />
          {t(`category.${place.category}`)}
        </span>
      </div>

      <h2 id="place-title">{localize(place.name)}</h2>
      {place.subtitle && <p className="details-subtitle">{place.subtitle}</p>}
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

      {groups.length > 0 && (
        <div className="inside">
          <h3>{t('insideBuilding')}</h3>
          {groups.map((g) => (
            <section key={g.level || 'none'} className="level-group">
              <h4>{g.level || t('levelNotListed')}</h4>
              <ul>
                {g.places.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="place-row" onClick={() => onSelect(p)}>
                      <CategoryBadge id={p.category} />
                      <span className="place-text">
                        <strong>{localize(p.name)}</strong>
                        <small>{[p.room && `${t('room')} ${p.room}`].filter(Boolean).join('')}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
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
    </article>
  );
}
