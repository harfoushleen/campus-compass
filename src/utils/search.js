// Filters places by campus, category and a free-text query.
// The query matches name, building, description, category label and keywords,
// ignoring case and accents (so "cafe" finds "Café").
const normalize = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function filterPlaces(places, { campus, category, query, localize, t }) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const nameOf = (id) => localize(places.find((p) => p.id === id)?.name);

  return places.filter((p) => {
    if (p.campus !== campus) return false;
    if (category && p.category !== category) return false;
    if (!words.length) return true;
    const haystack = normalize(
      [
        localize(p.name),
        p.building && `${p.building} ${nameOf(p.building)}`, // building code and name
        p.near && `${p.near} ${nameOf(p.near)}`,             // nearby building (hangout spots)
        ...(p.features ?? []).map((f) => t(`feature.${f}`)),
        localize(p.description),
        t(`category.${p.category}`),
        ...(p.keywords ?? []).map(localize),
      ].join(' ')
    );
    // Every word typed must appear somewhere.
    return words.every((w) => haystack.includes(w));
  });
}
