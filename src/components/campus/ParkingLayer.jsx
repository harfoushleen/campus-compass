// Parking layer (toggled with the "Parking" button): lot outlines and P badges.
import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
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

export default function ParkingLayer({ onSelect, labelsRef }) {
  const lots = useMemo(
    () =>
      PARKING.map((lot) => {
        const [cx, cz] = centroid(lot.area);
        // Surface lots lie on the ground; underground ones are shown as a see-through area.
        return { ...lot, geometry: flatPolygon(lot.area, heightAt(cx, cz) + 0.3) };
      }),
    []
  );

  return lots.map((lot) => {
    const [bx, bz] = lot.badge;
    return (
      <group key={lot.code}>
        <mesh geometry={lot.geometry} raycast={() => null}>
          <meshBasicMaterial color={lot.underground ? '#1f6feb' : '#2f2f2f'} transparent opacity={lot.underground ? 0.35 : 0.85} />
        </mesh>
        <Html portal={labelsRef} position={[bx, heightAt(bx, bz) + 14, bz]} center zIndexRange={[30, 20]}>
          <Badge lot={lot} onSelect={onSelect} />
        </Html>
      </group>
    );
  });
}
