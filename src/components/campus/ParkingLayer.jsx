// Parking lots on the ground. The surface lots are always drawn, so the map is complete.
// When the Parking category is open in the sidebar, the underground lots (U and G) are outlined
// too, as see-through areas, since they can't be seen from above. The pins are
// normal facility pins; see FacilityPins.jsx.
import { useMemo } from 'react';
import { buildDrapedLots, centroid, flatPolygon } from '../../campus/geometry.js';
import { buildParkingLines } from '../../campus/details.js';
import { useModel } from './model.js';

export default function ParkingLayer({ showUnderground }) {
  const m = useModel();
  // Campuses with DRAPE_PARKING lay each lot over the slope; the others draw it flat at one height.
  const lots = useMemo(
    () =>
      m.PARKING.map((lot) => {
        // Surface lots on a slope are laid over it (DRAPE_PARKING); underground lots are outlines at the level above them.
        if (m.DRAPE_PARKING && !lot.underground) return { ...lot, geometry: buildDrapedLots(m, [lot])[0].geometry };
        const [cx, cz] = centroid(lot.area);
        return { ...lot, geometry: flatPolygon(lot.area, m.heightAt(cx, cz) + 0.3) };
      }),
    [m]
  );
  const sheet = m.LAYER_OFFSET ? { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 } : {};

  // White bay lines on the surface lots (campuses with PARKING_BAYS: Byblos).
  const bays = useMemo(() => (m.PARKING_BAYS ? buildParkingLines(m) : null), [m]);

  return (
    <>
      {lots
        .filter((lot) => !lot.underground || showUnderground)
        .map((lot) => (
          <mesh key={lot.code} geometry={lot.geometry} raycast={() => null}>
            <meshBasicMaterial color={lot.underground ? '#1f6feb' : '#2f2f2f'} transparent opacity={lot.underground ? 0.35 : 0.85} {...sheet} />
          </mesh>
        ))}
      {bays && (
        <mesh geometry={bays} raycast={() => null}>
          <meshBasicMaterial color="#e9e9e4" {...(m.LAYER_OFFSET ? { polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 } : {})} />
        </mesh>
      )}
    </>
  );
}
