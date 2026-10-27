// Parking lots on the ground. The surface lots are always drawn, so the map is complete.
// When the Parking category is open in the sidebar, the underground lots (U and G) are outlined
// too, as see-through areas, since they can't be seen from above. The pins are
// normal facility pins; see FacilityPins.jsx.
import { useMemo } from 'react';
import { centroid, flatPolygon } from '../../campus/geometry.js';
import { buildParkingLines } from '../../campus/details.js';
import { useModel } from './model.js';

export default function ParkingLayer({ showUnderground }) {
  const m = useModel();
  const lots = useMemo(
    () =>
      m.PARKING.map((lot) => {
        const [cx, cz] = centroid(lot.area);
        return { ...lot, geometry: flatPolygon(lot.area, m.heightAt(cx, cz) + 0.3) };
      }),
    [m]
  );

  // White bay lines on the surface lots (campuses with PARKING_BAYS: Byblos).
  const bays = useMemo(() => (m.PARKING_BAYS ? buildParkingLines(m) : null), [m]);

  return (
    <>
      {lots
        .filter((lot) => !lot.underground || showUnderground)
        .map((lot) => (
          <mesh key={lot.code} geometry={lot.geometry} raycast={() => null}>
            <meshBasicMaterial color={lot.underground ? '#1f6feb' : '#2f2f2f'} transparent opacity={lot.underground ? 0.35 : 0.85} />
          </mesh>
        ))}
      {bays && (
        <mesh geometry={bays} raycast={() => null}>
          <meshBasicMaterial color="#e9e9e4" />
        </mesh>
      )}
    </>
  );
}
