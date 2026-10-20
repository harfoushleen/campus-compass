// Place categories. The `id` is what you put in the "category" field of places.json
// (a place can also appear under other chips with "alsoCategories": ["food"]).
//
//   color  chip / pin colour. The 8 facility colours come from the Okabe–Ito palette,
//          which stays distinguishable for most kinds of colour blindness.
//   icon   SVG path (24 × 24). Every category has its own icon, so colour is never the only cue.
//   label  comes from src/i18n (key: category.<id>)
//
// To add a category: add an entry here AND a label in each language file in src/i18n.
const DEFS = [
  // Facilities (shown as pins on demand)
  { id: 'acadsvc', color: '#0072B2', icon: 'M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2V17c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.8l-7 3.8-7-3.8z' },                                  // graduation cap
  { id: 'student', color: '#CC79A7', icon: 'M12 21.4 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.4z' }, // heart
  { id: 'food', color: '#E69F00', icon: 'M3 4h14v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V4zm14 1h2a3 3 0 0 1 0 6h-2V5zM4 20h12v2H4v-2z' },                                            // cup
  { id: 'study', color: '#009E73', icon: 'M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V4zm16 0h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7V4z' },                                       // open book
  { id: 'sports', color: '#D55E00', icon: 'M2 9h2V7h2v10H4v-2H2V9zm20 0h-2V7h-2v10h2v-2h2V9zM7 11h10v2H7v-2z' },                                                          // dumbbell
  { id: 'techid', color: '#56B4E9', icon: 'M4 5h16v11H4V5zm-2 12h20v2H2v-2z' },                                                                                            // laptop
  { id: 'venues', color: '#F0E442', icon: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5z' },                                       // star
  // Outdoor spots
  { id: 'hangout', color: '#6A4C93', icon: 'M4 9h16v3H4zM3 13h18v2H3zM5 15h2v4H5zm12 0h2v4h-2zM6 7h2v2H6zm10 0h2v2h-2z' },                                              // bench
  { id: 'cats', color: '#B8692F', icon: 'M12 11c-3 0-5 2.6-5 5 0 1.5 1.2 2.5 2.7 2.5 1 0 1.6-.5 2.3-.5s1.3.5 2.3.5c1.5 0 2.7-1 2.7-2.5 0-2.4-2-5-5-5zM5.5 9a1.8 2.3 0 1 0 0 .01zM9.5 5.5a1.8 2.4 0 1 0 0 .01zM14.5 5.5a1.8 2.4 0 1 0 0 .01zM18.5 9a1.8 2.3 0 1 0 0 .01z' }, // paw
  // The buildings themselves and parking (no pins)
  { id: 'buildings', color: '#6B7A86', icon: 'M5 21V3h9v6h5v12H5zm3-14v2h3V7H8zm0 4v2h3v-2H8zm0 4v2h3v-2H8zm7-2v2h2v-2h-2zm0 4v2h2v-2h-2z' },                                // building
  { id: 'parking', color: '#24292F', icon: 'M7 4h6a4 4 0 0 1 0 8H9v8H7V4zm2 2v4h4a2 2 0 0 0 0-4H9z' },                                                                  // P
];

// Picks white or dark text/icons for a colour, whichever has more contrast.
function inkFor(hex) {
  const lum = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const dark = '#1c2321';
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  return contrast(hex, '#ffffff') >= contrast(hex, dark) ? '#ffffff' : dark;
}

export const CATEGORIES = DEFS.map((c) => ({ ...c, ink: inkFor(c.color) }));

const FALLBACK = { id: 'other', color: '#6e7781', ink: '#ffffff', icon: 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z' };

// Look up a category by id (falls back to grey if the id is unknown).
export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}

/** True if the place belongs under the category: its own category, or one of its alsoCategories. */
export const inCategory = (place, id) => place.category === id || (place.alsoCategories?.includes(id) ?? false);
