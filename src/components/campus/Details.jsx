// Campus details that repeat a lot (windows, floor bands, trees) plus terraces and the
// amphitheater. Repeated items use one InstancedMesh per kind: one draw call each.
// None of these react to taps, so taps go through to the buildings.
import { useMemo } from 'react';
import * as THREE from 'three';
import { WINDOWS } from '../../campus/buildings.js';
import { TREES, TERRACES, AMPHITHEATER } from '../../campus/site.js';
import { buildAmphitheater, buildFacadeInstances, buildTerraces, buildTreeInstances } from '../../campus/details.js';

const noRaycast = () => null;
const tmp = new THREE.Object3D();
const tmpColor = new THREE.Color();

/** Makes an InstancedMesh and places one copy per item using `place(item, object3D)`. */
function instanced(geometry, material, items, place, colorOf) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  items.forEach((item, i) => {
    tmp.position.set(0, 0, 0); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, 1, 1);
    place(item, tmp);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
    if (colorOf) mesh.setColorAt(i, tmpColor.set(colorOf(item)));
  });
  mesh.raycast = noRaycast;
  return mesh;
}

export default function Details() {
  const meshes = useMemo(() => {
    const { windows, bands } = buildFacadeInstances();
    const trees = buildTreeInstances();
    const white = new THREE.MeshLambertMaterial({ color: '#ffffff' }); // tinted per instance

    return [
      instanced(new THREE.PlaneGeometry(WINDOWS.width, WINDOWS.height), white, windows, (w, o) => {
        o.position.set(...w.position);
        o.rotation.y = w.rotationY;
      }, (w) => w.color),
      instanced(new THREE.BoxGeometry(1, 1, 0.15), white, bands, (b, o) => {
        o.position.set(...b.position);
        o.rotation.y = b.rotationY;
        o.scale.set(b.length, b.height, 1);
      }, (b) => b.color),
      // Trees: a low-poly crown on a short trunk.
      instanced(new THREE.IcosahedronGeometry(3, 0), white, trees, (t, o) => {
        o.position.set(t.position[0], t.position[1] + 5 * t.size, t.position[2]);
        o.scale.setScalar(t.size);
      }, (t) => TREES.colors[t.shade < 0.5 ? 0 : 1]),
      instanced(new THREE.CylinderGeometry(0.3, 0.45, 3, 5), new THREE.MeshLambertMaterial({ color: TREES.trunk }), trees, (t, o) => {
        o.position.set(t.position[0], t.position[1] + 1.5 * t.size, t.position[2]);
        o.scale.setScalar(t.size);
      }),
    ];
  }, []);

  const terraces = useMemo(buildTerraces, []);
  const amphitheater = useMemo(buildAmphitheater, []);
  const terraceMaterials = useMemo(
    () => [new THREE.MeshLambertMaterial({ color: TERRACES.grass }), new THREE.MeshLambertMaterial({ color: TERRACES.wall })],
    []
  );

  return (
    <group>
      {meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
      {/* Terraces: grass tops, stone walls. */}
      {terraces.map((g, i) => (
        <mesh key={`t${i}`} geometry={g} material={terraceMaterials} raycast={noRaycast} />
      ))}
      <mesh geometry={amphitheater} raycast={noRaycast}>
        <meshLambertMaterial color={AMPHITHEATER.color} />
      </mesh>
    </group>
  );
}
