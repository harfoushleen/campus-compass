// Pins for facilities and outdoor spots. There are none by default: they only appear for
// the place you picked, or for the places in the category chip you turned on.
//   - one place in a spot: tapping the pin opens it
//   - several places in one building: one pin with a count; tapping it opens the building,
//     whose details list every place inside (with level and room)
// The pin shows only its icon (so it stays small); the selected pin also shows a name.
import { getCategory } from '../../data/categories.js';
import { CategoryIcon } from '../CategoryIcon.jsx';
import { LABELS } from '../../campus/site.js';
import { getPlace } from '../../data/places.js';
import { ManagedLabel } from './labels.jsx';

export default function FacilityPins({ groups, selectedId, onSelect, name }) {
  return groups.map((g) => {
    const cat = getCategory(g.category);
    const selectedPlace = g.places.find((p) => p.id === selectedId);
    const active = Boolean(selectedPlace) || (g.building && g.building === selectedId);
    // Name shown next to the selected pin (a stacked pin whose building is open shows only its count).
    const title = selectedPlace ? name(selectedPlace) : '';
    const onTap = () => onSelect(g.places.length === 1 ? g.places[0].id : g.building);
    const label = g.places.length > 1 ? `${name(getPlace(g.building))} (${g.places.length})` : name(g.places[0]);

    return (
      <ManagedLabel key={g.key} position={g.anchor} priority={LABELS.hangoutPriority} pinned={active} compactable zIndexRange={[25, 15]}>
        <button
          type="button"
          className={`facility-pin ${active ? 'active' : ''}`}
          style={{ '--pin-color': cat.color, '--pin-ink': cat.ink }}
          onClick={onTap}
          aria-label={label}
        >
          <span className="label-icon">
            {g.places.length === 1 && g.places[0].code ? <span className="pin-code">{g.places[0].code}</span> : <CategoryIcon id={g.category} size={16} />}
          </span>
          {g.places.length > 1 && <span className="pin-count">{g.places.length}</span>}
          <span className="label-text">{title}</span>
        </button>
      </ManagedLabel>
    );
  });
}
