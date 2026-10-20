// The sidebar's list: an accordion of categories. Opening one (only one at a time) shows its places
// underneath, and the map shows that category's pins. Opening a building shows the places inside it,
// grouped by level.
import { useState } from 'react';
import { CATEGORIES, getCategory, inCategory } from '../data/categories.js';
import { levelOrder, placeSubtitle } from '../data/places.js';
import { useI18n } from '../i18n/index.jsx';
import { CategoryBadge } from './CategoryIcon.jsx';
import { placesByLevel } from './PlaceDetails.jsx';
import { ChevronIcon, ForwardIcon } from './icons.jsx';

// The order of the rows (a category with no places on this campus is left out).
const ORDER = ['acadsvc', 'student', 'food', 'study', 'sports', 'techid', 'venues', 'hangout', 'cats', 'parking', 'buildings'];
const PARKING_ORDER = 'MULG'; // Middle Gate, Underground, Lower Gate, Gezairi

const sortPlaces = (items, categoryId) =>
  [...items].sort((a, b) => (categoryId === 'parking' ? PARKING_ORDER.indexOf(a.code) - PARKING_ORDER.indexOf(b.code) : a.name.localeCompare(b.name)));

/** One place: its name, a short second line, and the category icon (letter for parking). */
function PlaceRow({ place, selected, onSelect }) {
  const { t, localize } = useI18n();
  return (
    <button type="button" className={`place-row ${selected ? 'selected' : ''}`} onClick={() => onSelect(place)}>
      {place.code ? <span className="cat-badge code" style={{ '--cat-color': getCategory(place.category).color, '--cat-ink': getCategory(place.category).ink }}>{place.code}</span> : <CategoryBadge id={place.category} />}
      <span className="place-text">
        <strong>{localize(place.name)}</strong>
        <small>{placeSubtitle(place, t)}</small>
      </span>
      <ForwardIcon className="row-arrow" size={16} />
    </button>
  );
}

const SHOWN = 4; // places shown before the "More" row (a list of just one more is shown in full)

/** A list that shows the first few items, then a "More (n)" row that reveals the rest. */
function ShortList({ items, renderItem }) {
  const { t } = useI18n();
  const [all, setAll] = useState(false);
  const collapsible = items.length > SHOWN + 1;
  const visible = collapsible && !all ? items.slice(0, SHOWN) : items;
  return (
    <>
      <ul className="place-list">{visible.map(renderItem)}</ul>
      {collapsible && (
        <button type="button" className={`more-row ${all ? 'open' : ''}`} aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? t('less') : `${t('more')} (${items.length - SHOWN})`}
          <ChevronIcon className="chev" size={16} />
        </button>
      )}
    </>
  );
}

/** The buildings, each opening to its places grouped by level. */
function BuildingList({ buildings, selectedId, onSelect }) {
  const { t, localize } = useI18n();
  const [openBuilding, setOpenBuilding] = useState(null);
  return (
    <ShortList
      items={buildings}
      renderItem={(b) => {
        const open = openBuilding === b.id;
        const groups = placesByLevel(b.id);
        return (
          <li key={b.id} className={`bldg ${open ? 'open' : ''}`}>
            <div className="bldg-head">
              <button type="button" className={`place-row ${selectedId === b.id ? 'selected' : ''}`} onClick={() => onSelect(b)}>
                <CategoryBadge id="buildings" />
                <span className="place-text">
                  <strong>{localize(b.name)}</strong>
                  <small>{placeSubtitle(b, t)}</small>
                </span>
              </button>
              {groups.length > 0 && (
                <button
                  type="button"
                  className="round-btn small"
                  aria-expanded={open}
                  aria-label={t('showPlacesInside')}
                  title={t('showPlacesInside')}
                  onClick={() => setOpenBuilding(open ? null : b.id)}
                >
                  <ChevronIcon className="chev" size={18} />
                </button>
              )}
            </div>
            <div className="acc-panel" inert={!open}>
              <div className="acc-inner">
                {groups.map((g) => (
                  <section key={g.level || 'none'} className="level-group">
                    <h4>{g.level || t('levelNotListed')}</h4>
                    <ul>
                      {g.places.map((p) => (
                        <li key={p.id}>
                          <PlaceRow place={p} selected={selectedId === p.id} onSelect={onSelect} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </li>
        );
      }}
    />
  );
}

export default function CategoryAccordion({ places, openId, onToggle, selectedId, onSelect }) {
  const { t } = useI18n();
  const rows = ORDER.map((id) => ({ id, items: sortPlaces(places.filter((p) => inCategory(p, id)), id) })).filter((r) => r.items.length > 0);

  return (
    <ul className="acc">
      {rows.map(({ id, items }) => {
        const open = openId === id;
        const cat = CATEGORIES.find((c) => c.id === id);
        return (
          <li key={id} className={`acc-item ${open ? 'open' : ''}`} style={{ '--cat-color': cat.color, '--cat-ink': cat.ink }}>
            <button type="button" className="acc-head" aria-expanded={open} onClick={() => onToggle(id)}>
              <CategoryBadge id={id} size={18} />
              <span className="acc-name">{t(`category.${id}`)}</span>
              <span className="acc-count">{items.length}</span>
              <ChevronIcon className="chev" size={18} />
            </button>
            <div className="acc-panel" inert={!open}>
              <div className="acc-inner">
                {id === 'buildings' ? (
                  <BuildingList buildings={items} selectedId={selectedId} onSelect={onSelect} />
                ) : (
                  <ShortList
                    items={items}
                    renderItem={(p) => (
                      <li key={p.id}>
                        <PlaceRow place={p} selected={selectedId === p.id} onSelect={onSelect} />
                      </li>
                    )}
                  />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
