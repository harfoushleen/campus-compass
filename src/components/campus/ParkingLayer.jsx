// Parking lots on the ground. The surface lots (M and L) are always drawn, so the map is complete.
// When the Parking category is open in the sidebar, the underground lots (U and G) are outlined
// too, as see-through areas, since they can't be seen from above. The pins (M, U, L, G) are
// normal facility pins; see FacilityPins.jsx.
import { useMemo } from 'react';
import { PARKING, heightAt } from '../../campus/site.js';
import { centroid, flatPolygon } from '../../campus/geometry.js';

export default function ParkingLayer({ showUnderground }) {
  const lots = useMemo(
    () =>
      PARKING.map((lot) => {
        const [cx, cz] = centroid(lot.area);
        return { ...lot, geometry: flatPolygon(lot.area, heightAt(cx, cz) + 0.3) };
      }),
    []
  );

  return lots
    .filter((lot) => !lot.underground || showUnderground)
    .map((lot) => (
      <mesh key={lot.code} geometry={lot.geometry} raycast={() => null}>
        <meshBasicMaterial color={lot.underground ? '#1f6feb' : '#2f2f2f'} transparent opacity={lot.underground ? 0.35 : 0.85} />
      </mesh>
    ));
}
