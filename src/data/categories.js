// Place categories. The `id` is what you put in the "category" field of places.json.
// `color` is the marker/chip color. The visible label comes from src/i18n (key: category.<id>).
// To add a category: add an entry here AND a label in each language file in src/i18n.
export const CATEGORIES = [
  { id: 'academic',      color: '#1f6feb' }, // academic buildings
  { id: 'offices',       color: '#8250df' }, // registrar, financial aid, advising
  { id: 'services',      color: '#d1242f' }, // counseling, health, ISP
  { id: 'study',         color: '#0a7d5a' }, // study spaces & libraries
  { id: 'labs',          color: '#bf8700' }, // labs
  { id: 'food',          color: '#e8590c' }, // food
  { id: 'hangout',       color: '#d6336c' }, // outdoor hangout spots (gardens, benches, fountain)
  { id: 'cats',          color: '#b8692f' }, // the cat area
  { id: 'printing',      color: '#57606a' }, // printing
  { id: 'prayer',        color: '#0e8a9b' }, // prayer rooms
  { id: 'accessibility', color: '#0550ae' }, // ramps, elevators
  { id: 'parking',       color: '#24292f' }, // parking lots
];

const FALLBACK = { id: 'other', color: '#6e7781' };

// Look up a category by id (falls back to grey if the id is unknown).
export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}
