// Hangout spots: small 3D touches (benches, kiosk, fountain, a standout tree, shrubs)
// plus a tappable pink pin with the spot's name. Spots come from places.json
// (category "hangout", with a `position`); the 3D touches from HANGOUT_DECOR in site.js.
import { useMemo } from 'react';
import * as THREE from 'three';
import { HANGOUT_COLORS, HANGOUT_DECOR, LABELS, heightAt } from '../../campus/site.js';
import { benchGeometry, buildHangoutDecor } from '../../campus/details.js';
import { getCategory } from '../../data/categories.js';
import { ManagedLabel } from './labels.jsx';

const noRaycast = () => null;
const lambert = (color) => new THREE.MeshLambertMaterial({ color });

/** Instanced copies of one geometry at the given positions/rotations. */
function instances(geometry, material, items) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const o = new THREE.Object3D();
  items.forEach((item, i) => {
    o.position.set(...item.position);
    o.rotation.set(0, item.rotationY ?? 0, 0);
    o.scale.set(1, item.scaleY ?? 1, 1);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  mesh.raycast = noRaycast;
  return mesh;
}

/** The static 3D decorations. Built once; a handful of draw calls in total. */
function Decor() {
  const objects = useMemo(() => {
    const d = buildHangoutDecor();
    const list = [];
    if (d.benches.length) list.push(instances(benchGeometry(), lambert(HANGOUT_COLORS.bench), d.benches));
    if (d.shrubs.length) {
      const shrub = new THREE.IcosahedronGeometry(1.5, 0);
      shrub.scale(1, 0.7, 1).translate(0, 0.8, 0);
      list.push(instances(shrub, lambert(HANGOUT_COLORS.shrub), d.shrubs));
    }
    const mesh = (geometry, color) => {
      if (!geometry) return;
      const m = new THREE.Mesh(geometry, lambert(color));
      m.raycast = noRaycast;
      list.push(m);
    };
    mesh(d.kiosk, HANGOUT_COLORS.kiosk);
    mesh(d.awning, HANGOUT_COLORS.awning);
    mesh(d.grass, HANGOUT_COLORS.grass);
    mesh(d.pergola, HANGOUT_COLORS.wood);
    mesh(d.vine, HANGOUT_COLORS.vine);
    mesh(d.catHouse, HANGOUT_COLORS.catHouse);
    mesh(d.catRoof, HANGOUT_COLORS.catRoof);
    mesh(d.stone, HANGOUT_COLORS.fountainStone);
    mesh(d.water, HANGOUT_COLORS.water);
    mesh(d.trunk, '#6b4f3a');
    const tree = Object.values(HANGOUT_DECOR).find((x) => x.featureTree)?.featureTree;
    mesh(d.crown, tree?.color ?? '#7fb04a');
    return list;
  }, []);

  return objects.map((o, i) => <primitive key={i} object={o} />);
}

/** Small paw icon, used for the cat area. */
function PawIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="12" cy="16.5" rx="4.5" ry="3.8" />
        <ellipse cx="5.5" cy="11" rx="1.9" ry="2.5" />
        <ellipse cx="9.5" cy="6.8" rx="1.9" ry="2.6" />
        <ellipse cx="14.5" cy="6.8" rx="1.9" ry="2.6" />
        <ellipse cx="18.5" cy="11" rx="1.9" ry="2.5" />
      </g>
    </svg>
  );
}

/** Small bench icon used inside the pin. */
function BenchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M4 9h16v3H4zM3 13h18v2H3zM5 15h2v4H5zm12 0h2v4h-2zM6 7h2v2H6zm10 0h2v2h-2z" fill="currentColor" />
    </svg>
  );
}

/**
 * The decorations are always drawn. `spots` are the places that get a pin
 * (hangout spots, and the cat area), already filtered by search/category.
 * selectedId  id of the selected place
 */
export default function Hangouts({ spots, selectedId, onSelect, name }) {
  return (
    <group>
      <Decor />
      {spots.map((spot) => {
        const [x, z] = spot.position;
        const selected = spot.id === selectedId;
        return (
          <ManagedLabel
            key={spot.id}
            position={[x, heightAt(x, z) + 7, z]}
            priority={LABELS.hangoutPriority}
            pinned={selected}
            compactable
            zIndexRange={[25, 15]}
          >
            <button
              type="button"
              className={`hangout-pin ${selected ? 'active' : ''}`}
              style={{ '--pin-color': getCategory(spot.category).color }}
              onClick={() => onSelect(spot.id)}
              aria-label={name(spot)}
            >
              <span className="label-icon">
                {spot.category === 'cats' ? <PawIcon /> : <BenchIcon />}
              </span>
              <span className="label-text">{name(spot)}</span>
            </button>
          </ManagedLabel>
        );
      })}
    </group>
  );
}
