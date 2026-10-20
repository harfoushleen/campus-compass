// Opening hours for a place.
//
// Hours that can be read from LAU's official pages are kept in src/data/hours.json, which is
// refreshed every week by scripts/update-hours.js (see the README). Each entry there has
// the hours, the date they were checked, and "stale: true" if the last check couldn't read
// the page (the old hours are kept and shown as "may be outdated").
// If a place has no entry there, the plain "hours" text from places.json is used.
// Returns null when nothing is known, so the details sheet can say so instead of showing nothing.
import hoursData from './hours.json';

export const HOURS_UPDATED = hoursData.updated;

export function getHours(place) {
  const entry = hoursData.entries?.[place.hoursKey ?? place.id];
  if (entry?.hours) {
    return { text: entry.hours, checked: entry.checked, stale: Boolean(entry.stale), source: entry.source, auto: true };
  }
  if (place.hours) {
    return { text: place.hours, checked: place.checked ?? place.sourceDate, stale: false, source: place.source, auto: false };
  }
  return null;
}
