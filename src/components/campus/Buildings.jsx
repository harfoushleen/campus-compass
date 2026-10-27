// LAU buildings, built from the campus's buildings.js: walls, roofs and small extras per building.
// Hover highlights a building; tap/click selects it. Names float above as labels.
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { ManagedLabel } from './labels.jsx';
import { ROOFS, EXTRA_COLORS, WINDOWS } from '../../campus/common.js';
import { centroid, extrudeFootprint, partHeights } from '../../campus/geometry.js';
import { useModel } from './model.js';
import { buildingTop, courtsLayout, getCourtTexture, hipRoof, sawtoothRoof } from '../../campus/details.js';

// Shared materials: one per colour, reused by every building with that colour.
const materials = new Map();
function material(color, side = THREE.FrontSide) {
  const key = color + side;
  if (!materials.has(key)) materials.set(key, new THREE.MeshLambertMaterial({ color, side }));
  return materials.get(key);
}

const COURT_GREEN = '#3f7537'; // same green as the court markings texture

// Greyed-out version of a colour (for buildings hidden by a filter), so it
// still reads as a campus building and not as part of the city around it.
const fade = (color, dimmed) => '#' + new THREE.Color(color).lerp(new THREE.Color(dimmed), 0.65).getHexString();

/** Geometry for one extra (box or cylinder), see EXTRAS in buildings.js. */
function extraGeometry(m, extra, building) {
  const [x, z] = extra.at;
  const top = buildingTop(m, building);
  const bottom = extra.base === 'top' ? top : m.heightAt(x, z) - 1;
  const height = extra.height === 'full' ? top - bottom + (extra.above ?? 0) : extra.height;
  const g =
    extra.shape === 'cylinder'
      ? new THREE.CylinderGeometry(extra.size, extra.size, height, 20)
      : new THREE.BoxGeometry(extra.size[0], height, extra.size[1]);
  if (extra.angle) g.rotateY((-extra.angle * Math.PI) / 180);
  g.translate(x, bottom + height / 2, z);
  return g;
}

// Geometry for every building, built once when the 3D view loads.
function buildGeometry(m) {
  const { BUILDINGS, STYLES } = m;
  return BUILDINGS.map((b) => {
    let labelY = 0;
    const parts = b.parts.map((part) => {
      const { bottom, top } = partHeights(m, part);
      const style = STYLES[part.style ?? b.style];
      const p = { geometry: extrudeFootprint(part.footprint, bottom, top), style, roof: null, courts: null, slab: null };
      let roofHeight = 0;
      if (part.roof === 'hip') {
        const r = hipRoof(part.footprint, top);
        p.roof = { geometry: r.geometry, color: ROOFS.hip };
        roofHeight = r.height;
      } else if (part.roof === 'sawtooth') {
        const r = sawtoothRoof(m, part.footprint, top);
        p.roof = { geometry: r.geometry, color: ROOFS.sawtooth, glass: r.glass };
        roofHeight = r.height;
      } else if (part.roof === 'courts') {
        const { courts, slab } = courtsLayout(part.footprint, top);
        p.courts = courts.map((court) => {
          const g = new THREE.PlaneGeometry(...court.size);
          g.rotateX(-Math.PI / 2);
          g.rotateY(court.rotationY);
          g.translate(...court.position);
          return g;
        });
        p.slab = new THREE.BoxGeometry(...slab.size).rotateY(slab.rotationY).translate(...slab.position);
        roofHeight = slab.size[1];
      }
      labelY = Math.max(labelY, top + roofHeight);
      return p;
    });
    const extras = (b.extras ?? []).map((e) => ({
      geometry: extraGeometry(m, e, b),
      color: EXTRA_COLORS[e.color] ?? e.color,
    }));
    const [cx, cz] = centroid(b.parts.flatMap((p) => p.footprint));
    const [dx, dz] = b.labelOffset ?? [0, 0];
    return { ...b, parts, extras, labelPosition: [cx + dx, labelY + 5, cz + dz] };
  });
}

// A drag that moves more than this (in pixels) is a camera move, not a tap.
const TAP_TOLERANCE = 6;

export default function Buildings({ activeIds, selectedId, onSelect, showLabels }) {
  const m = useModel();
  const { COLORS } = m;
  const buildings = useMemo(() => buildGeometry(m), [m]);
  const [hoveredId, setHoveredId] = useState(null);

  return buildings.map((b) => {
    const isHovered = hoveredId === b.id;
    const isSelected = selectedId === b.id;
    const isDimmed = activeIds && !activeIds.has(b.id) && !isSelected;
    const tint = (color) => (isSelected ? COLORS.selected : isHovered ? COLORS.highlight : isDimmed ? fade(color, COLORS.dimmed) : color);

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
        {b.parts.map((part, i) => (
          <group key={i}>
            {/* Extruded block: group 0 = top/bottom (roof colour), group 1 = walls. */}
            <mesh geometry={part.geometry} material={[material(isDimmed ? fade(part.style.roof, COLORS.dimmed) : part.style.roof), material(tint(part.style.wall))]} />
            {part.roof && <mesh geometry={part.roof.geometry} material={material(isDimmed ? fade(part.roof.color, COLORS.dimmed) : part.roof.color, THREE.DoubleSide)} />}
            {part.roof?.glass && <mesh geometry={part.roof.glass} material={material(WINDOWS.color)} raycast={() => null} />}
            {/* Raised tennis field: concrete sides, green top. Box faces: +x, -x, +y (top), -y, +z, -z. */}
            {part.slab && (
              <mesh
                geometry={part.slab}
                material={[tint(part.style.wall), tint(part.style.wall), isDimmed ? fade(COURT_GREEN, COLORS.dimmed) : COURT_GREEN, tint(part.style.wall), tint(part.style.wall), tint(part.style.wall)].map((c) => material(c))}
              />
            )}
            {part.courts?.map((court, k) => (
              <mesh key={k} geometry={court} raycast={() => null}>
                <meshLambertMaterial map={getCourtTexture()} />
              </mesh>
            ))}
          </group>
        ))}
        {b.extras.map((extra, i) => (
          <mesh key={`x${i}`} geometry={extra.geometry} material={material(tint(extra.color))} />
        ))}

        {(showLabels || isHovered || isSelected) && (
          <ManagedLabel position={b.labelPosition} priority={b.labelPriority ?? 2} pinned={isHovered || isSelected}>
            {/* Short label normally; the full name when hovered or selected. */}
            <div className={`campus-label ${isHovered || isSelected ? 'active' : ''}`}>
              {isHovered || isSelected ? b.name : b.label ?? b.name}
            </div>
          </ManagedLabel>
        )}
      </group>
    );
  });
}
