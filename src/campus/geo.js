// Converts between GPS coordinates and the 3D scene's local coordinates.
//
// Scene coordinates are metres measured from ORIGIN (roughly the middle of the campus):
//   x = metres EAST   (negative = west)
//   z = metres SOUTH  (negative = north)
//   y = metres UP
// This matches Three.js (right-handed, y up), so these numbers can be used directly.

export const ORIGIN = { lat: 33.893, lng: 35.4781 };

const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

/** GPS (lat, lng) -> scene [x, z] */
export function toLocal(lat, lng) {
  return [(lng - ORIGIN.lng) * M_PER_DEG_LNG, -(lat - ORIGIN.lat) * M_PER_DEG_LAT];
}

/** scene [x, z] -> GPS [lat, lng] */
export function toLatLng(x, z) {
  return [ORIGIN.lat - z / M_PER_DEG_LAT, ORIGIN.lng + x / M_PER_DEG_LNG];
}
