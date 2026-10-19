// Parking lots. Surface lots are always drawn, so the map is complete.
// The "Parking" button adds the P badges and the see-through outlines of the
// underground lots (which can't be seen from above anyway).
import { useEffect, useMemo, useRef } from 'react';
import { ManagedLabel } from './labels.jsx';
import { PARKING, heightAt } from '../../campus/site.js';
import { centroid, flatPolygon } from '../../campus/geometry.js';

// A tappable badge floating in the 3D view.
// The camera controls grab every pointer press inside the 3D area, which would
// swallow taps on the badge. Native listeners stop the press before it gets there.
// (React's own stopPropagation runs too late, after the controls have reacted.)
function Badge({ lot, onSelect }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    const stop = (e) => e.stopPropagation();
    const select = (e) => {
      e.stopPropagation();
      onSelect(lot.placeId);
    };
    el.addEventListener('pointerdown', stop);
    el.addEventListener('click', select);
    return () => {
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('click', select);
    };
  }, [lot, onSelect]);

  return (
    <button ref={ref} type="button" className="parking-badge" title={`${lot.name} (${lot.access})`}>
      <span className="parking-p">P</span>
      <span className="parking-code">{lot.code}</span>
    </button>
  );
}

export default function ParkingLayer({ onSelect, showLayer }) {
  const lots = useMemo(
    () =>
      PARKING.map((lot) => {
        const [cx, cz] = centroid(lot.area);
        return { ...lot, geometry: flatPolygon(lot.area, heightAt(cx, cz) + 0.3) };
      }),
    []
  );

  return lots.map((lot) => {
    const [bx, bz] = lot.badge;
    return (
      <group key={lot.code}>
        {(!lot.underground || showLayer) && (
          <mesh geometry={lot.geometry} raycast={() => null}>
            <meshBasicMaterial color={lot.underground ? '#1f6feb' : '#2f2f2f'} transparent opacity={lot.underground ? 0.35 : 0.85} />
          </mesh>
        )}
        {showLayer && (
          // Pinned: parking badges always show while the layer is on.
          <ManagedLabel position={[bx, heightAt(bx, bz) + 14, bz]} pinned zIndexRange={[30, 20]}>
            <Badge lot={lot} onSelect={onSelect} />
          </ManagedLabel>
        )}
      </group>
    );
  });
}
