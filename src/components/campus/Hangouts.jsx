// Small 3D touches around the hangout spots (benches, kiosk, fountain, a standout tree, shrubs...),
// from HANGOUT_DECOR in site.js. They are always drawn.
import { useMemo } from 'react';
import * as THREE from 'three';
import { HANGOUT_COLORS, HANGOUT_DECOR } from '../../campus/site.js';
import { benchGeometry, buildHangoutDecor } from '../../campus/details.js';

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
    mesh(d.rock, HANGOUT_COLORS.rock);
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

/** The 3D touches around the hangout spots. Always drawn; the pins are in FacilityPins.jsx. */
export default function Hangouts() {
  return (
    <group>
      <Decor />
    </group>
  );
}
