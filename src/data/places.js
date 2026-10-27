// Loads places.json and checks it for common mistakes.
// Problems are printed in the browser console during development so a typo in the
// JSON file doesn't silently break the app.
import rawPlaces from './places.json';
import { CATEGORIES } from './categories.js';
import { CAMPUSES } from './campuses.js';
import * as beirutGeo from '../campus/beirut/geo.js';
import * as byblosGeo from '../campus/byblos/geo.js';

// Each campus has its own origin for converting a place's 3D position to GPS.
const GEO = { beirut: beirutGeo, byblos: byblosGeo };

const REQUIRED = ['id', 'name', 'campus', 'category'];

function validate(places) {
  const ids = new Set(places.map((p) => p.id));
  const seen = new Set();
  return places.filter((p, index) => {
    const label = `places.json entry #${index + 1} (${p.id ?? 'no id'})`;
    const missing = REQUIRED.filter((key) => p[key] === undefined || p[key] === '');
    if (missing.length) {
      console.warn(`${label}: missing ${missing.join(', ')} – skipped`);
      return false;
    }
    // Coordinates are optional (used for the Directions button), but must be numbers if given.
    const hasLat = p.latitude !== undefined && p.latitude !== '';
    const hasLng = p.longitude !== undefined && p.longitude !== '';
    if ((hasLat || hasLng) && (typeof p.latitude !== 'number' || typeof p.longitude !== 'number')) {
      console.warn(`${label}: latitude/longitude must both be numbers (no quotes) – skipped`);
      return false;
    }
    if (seen.has(p.id)) console.warn(`${label}: duplicate id`);
    if (!CATEGORIES.some((c) => c.id === p.category)) console.warn(`${label}: unknown category "${p.category}"`);
    if (!CAMPUSES.some((c) => c.id === p.campus)) console.warn(`${label}: unknown campus "${p.campus}"`);
    if (p.building && !ids.has(p.building)) console.warn(`${label}: building "${p.building}" is not an id in places.json`);
    if (p.near && !ids.has(p.near)) console.warn(`${label}: near "${p.near}" is not an id in places.json`);
    if (p.position !== undefined && !(Array.isArray(p.position) && p.position.length === 2 && p.position.every((n) => typeof n === 'number'))) {
      console.warn(`${label}: position must be [x, z] numbers – ignored`);
      delete p.position;
    }
    seen.add(p.id);
    return true;
  });
}

export const PLACES = validate(rawPlaces);

/** Looks up a place by id (e.g. a building code like "SH"). */
export const getPlace = (id) => PLACES.find((p) => p.id === id);

/** Coordinates for directions: the place's own, its 3D position, or else its building's. */
export function placeCoordinates(place) {
  if (typeof place.latitude === 'number') return [place.latitude, place.longitude];
  if (place.position) return GEO[place.campus].toLatLng(...place.position);
  const building = place.building && getPlace(place.building);
  return building && typeof building.latitude === 'number' ? [building.latitude, building.longitude] : null;
}

/** "Level 3 (lobby)" -> "Level 3". */
export const shortLevel = (level) => (level ?? '').replace(/\s*\(.*\)\s*$/, '').trim();

/** Sort key for "Level 4", "Ground floor", "Levels 8, 10 and 11"... (unknown levels go last). */
export const levelOrder = (level) => (/ground|street/i.test(level ?? '') ? 0 : parseInt((level ?? '').match(/\d+/)?.[0] ?? '99', 10));

/** Short name of a place, for subtitles ("Irwin", "Library"). */
export const shortName = (place) => place?.short ?? place?.name ?? '';

/** Second line of a place row: "Irwin · Level 1", "Near Sage Hall", "Students, faculty and staff"... */
export function placeSubtitle(place, t) {
  if (place.subtitle) return place.subtitle;
  const building = place.building ? getPlace(place.building) : null;
  if (building) return [shortName(building), shortLevel(place.level)].filter(Boolean).join(' · ');
  if (place.near) return `${t('near')} ${shortName(getPlace(place.near))}`;
  if (place.category === 'buildings') return t('placesInside', { count: PLACES.filter((p) => p.building === place.id).length });
  return '';
}
