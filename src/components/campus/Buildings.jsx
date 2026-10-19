// LAU buildings: one mesh per building part, built from buildings.js.
// Hover highlights a building and shows its name; tap/click selects it.
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { BUILDINGS, STYLES } from '../../campus/buildings.js';
import { COLORS } from '../../campus/site.js';
import { centroid, extrudeFootprint, partHeights } from '../../campus/geometry.js';

// Shared materials: one per colour, reused by every building with that colour.
const materials = new Map();
function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshLambertMaterial({ color }));
  return materials.get(color);
}

// Greyed-out version of a colour (for buildings hidden by a filter), so it
// still reads as a campus building and not as part of the city around it.
const fade = (color) => '#' + new THREE.Color(color).lerp(new THREE.Color(COLORS.dimmed), 0.65).getHexString();

// Geometry for every building, built once when the app loads.
function buildGeometry() {
  return BUILDINGS.map((b) => {
    let labelY = 0;
    const parts = b.parts.map((part) => {
      const { bottom, top } = partHeights(part);
      labelY = Math.max(labelY, top);
      return { geometry: extrudeFootprint(part.footprint, bottom, top), style: STYLES[part.style ?? b.style] };
    });
    const [cx, cz] = centroid(b.parts.flatMap((p) => p.footprint));
    return { ...b, parts, label: [cx, labelY + 4, cz] };
  });
}

// A drag that moves more than this (in pixels) is a camera move, not a tap.
const TAP_TOLERANCE = 6;

export default function Buildings({ activeIds, selectedId, onSelect, labelsRef }) {
  const buildings = useMemo(buildGeometry, []);
  const [hoveredId, setHoveredId] = useState(null);

  return buildings.map((b) => {
    const isHovered = hoveredId === b.id;
    const isSelected = selectedId === b.id;
    const isDimmed = activeIds && !activeIds.has(b.id) && !isSelected;

    return (
      <group
        key={b.id}
        onPointerOver={(e) => {
          e.stopPropagation(); // only the front-most building reacts
          setHoveredId(b.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHoveredId((id) => (id === b.id ? null : id));
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta <= TAP_TOLERANCE) onSelect(b.id);
        }}
      >
        {b.parts.map((part, i) => {
          const color = isSelected ? COLORS.selected : isHovered ? COLORS.highlight : isDimmed ? fade(part.style.wall) : part.style.wall;
          return <mesh key={i} geometry={part.geometry} material={material(color)} />;
        })}

        {(isHovered || isSelected) && (
          <Html portal={labelsRef} position={b.label} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
            <div className="campus-label">{b.name}</div>
          </Html>
        )}
      </group>
    );
  });
}
