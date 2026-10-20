// Where pins go, and how places are grouped into pins.
//   - A facility inside a building gets a pin above that building.
//   - Several places in the same building share one pin, with a count.
//   - An outdoor spot (hangout spots, cat area) gets its own pin at its position.
import { BUILDINGS } from './buildings.js';
import { heightAt } from './site.js';
import { buildingTop } from './details.js';
import { centroid } from './geometry.js';
import { inCategory } from '../data/categories.js';

const PIN_HEIGHT_ABOVE_ROOF = 11; // metres, so pins clear the building name label

const centres = new Map();
function buildingCentre(code) {
  if (!centres.has(code)) {
    const b = BUILDINGS.find((x) => x.id === code);
    centres.set(code, b ? { centre: centroid(b.parts.flatMap((p) => p.footprint)), top: buildingTop(b) } : null);
  }
  return centres.get(code);
}

/** Ground point [x, z] the camera should look at for a place, or null if it has no spot on the map. */
export function placeFocus(place) {
  if (place.building) return buildingCentre(place.building)?.centre ?? null;
  return place.position ?? null;
}

/** 3D position of the pin for a place, or null. */
export function placeAnchor(place) {
  if (place.building) {
    const b = buildingCentre(place.building);
    return b ? [b.centre[0], b.top + PIN_HEIGHT_ABOVE_ROOF, b.centre[1]] : null;
  }
  if (place.position) return [place.position[0], heightAt(...place.position) + 7, place.position[1]];
  return null;
}

/**
 * Groups places into pins. `category` is the active chip (or null): a pin takes the chip's
 * colour if it holds a place from that category, otherwise its first place's category.
 */
export function groupPins(places, category) {
  const groups = new Map();
  for (const place of places) {
    const anchor = placeAnchor(place);
    if (!anchor) continue;
    const key = place.building ? 'b:' + place.building : 'p:' + place.id;
    if (!groups.has(key)) groups.set(key, { key, building: place.building || null, anchor, places: [] });
    groups.get(key).places.push(place);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    category: category && g.places.some((p) => inCategory(p, category)) ? category : g.places[0].category,
  }));
}
