// Converts between GPS coordinates and a campus's 3D scene coordinates.
// Each campus has its own origin (see beirut/geo.js and byblos/geo.js).
//
// Scene coordinates are metres measured from the origin (roughly the middle of the campus):
//   x = metres EAST   (negative = west)
//   z = metres SOUTH  (negative = north)
//   y = metres UP
// This matches Three.js (right-handed, y up), so these numbers can be used directly.

export function makeGeo(origin) {
  const M_PER_DEG_LAT = 110574;
  const M_PER_DEG_LNG = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  return {
    ORIGIN: origin,
    /** GPS (lat, lng) -> scene [x, z] */
    toLocal: (lat, lng) => [(lng - origin.lng) * M_PER_DEG_LNG, -(lat - origin.lat) * M_PER_DEG_LAT],
    /** scene [x, z] -> GPS [lat, lng] */
    toLatLng: (x, z) => [origin.lat - z / M_PER_DEG_LAT, origin.lng + x / M_PER_DEG_LNG],
  };
}
