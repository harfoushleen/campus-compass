// Where pins go, and how places are grouped into pins.
//   - A facility inside a building gets a pin above that building.
//   - Several places in the same building share one pin, with a count.
//   - An outdoor spot (hangout spots, cat area) gets its own pin at its position.
// Every function takes the campus model `m` first (see src/campus/index.js).
import { buildingTop } from './details.js';
import { centroid } from './geometry.js';
import { inCategory } from '../data/categories.js';

const PIN_HEIGHT_ABOVE_ROOF = 11; // metres, so pins clear the building name label

const centresByModel = new WeakMap();
function buildingCentre(m, code) {
  if (!centresByModel.has(m)) centresByModel.set(m, new Map());
  const centres = centresByModel.get(m);
  if (!centres.has(code)) {
    const b = m.BUILDINGS.find((x) => x.id === code);
    centres.set(code, b ? { centre: centroid(b.parts.flatMap((p) => p.footprint)), top: buildingTop(m, b) } : null);
  }
  return centres.get(code);
}

/** Ground point [x, z] the camera should look at for a place, or null if it has no spot on the map. */
export function placeFocus(m, place) {
  if (place.building) return buildingCentre(m, place.building)?.centre ?? null;
  if (place.position) return place.position;
  return buildingCentre(m, place.id)?.centre ?? null; // a building itself
}

/** 3D position of the pin for a place, or null. */
export function placeAnchor(m, place) {
  if (place.building) {
    const b = buildingCentre(m, place.building);
    return b ? [b.centre[0], b.top + PIN_HEIGHT_ABOVE_ROOF, b.centre[1]] : null;
  }
  if (place.position) return [place.position[0], m.heightAt(...place.position) + 7, place.position[1]];
  // A building itself: the pin sits above it.
  const self = buildingCentre(m, place.id);
  return self ? [self.centre[0], self.top + PIN_HEIGHT_ABOVE_ROOF, self.centre[1]] : null;
}

/**
 * Groups places into pins. `category` is the active chip (or null): a pin takes the chip's
 * colour if it holds a place from that category, otherwise its first place's category.
 */
export function groupPins(m, places, category) {
  const groups = new Map();
  for (const place of places) {
    const anchor = placeAnchor(m, place);
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
