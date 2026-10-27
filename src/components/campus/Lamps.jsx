// Lamp posts along the paths. In daylight they are plain grey posts; at night each lamp
// glows, with a soft halo around it and a pool of light on the ground. The glow is faked
// (no real lights, which would be slow on phones) and fades with the dark scene.
// Positions come from buildLampPositions() in details.js, settings from LAMPS in campus/common.js.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { LAMPS } from '../../campus/common.js';
import { buildLampPositions } from '../../campus/details.js';
import { onNightLevel } from '../../campus/night.js';
import { useModel } from './model.js';

const noRaycast = () => null;

/** A soft white dot that fades to transparent at the edge (tinted by the material). */
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const fade = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  fade.addColorStop(0, 'rgba(255,255,255,1)');
  fade.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  fade.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = fade;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** The additive "light" look: adds to what is behind it and never hides anything. */
const lightMaterial = (Material, params) =>
  new Material({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, ...params });

export default function Lamps() {
  const m = useModel();
  const { heightAt } = m;
  const lamps = useMemo(() => {
    const spots = buildLampPositions(m).map(([x, z]) => [x, heightAt(x, z), z]);
    const map = glowTexture();
    const head = LAMPS.height + 0.25;

    const place = (geometry, material, matrixOf) => {
      const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
      const o = new THREE.Object3D();
      spots.forEach((spot, i) => {
        o.position.set(...spot);
        o.quaternion.identity();
        matrixOf?.(o, spot);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.raycast = noRaycast;
      return mesh;
    };

    const poles = place(
      new THREE.CylinderGeometry(0.08, 0.13, LAMPS.height, 6).translate(0, LAMPS.height / 2, 0),
      new THREE.MeshLambertMaterial({ color: LAMPS.poleColor })
    );
    const bulbs = place(new THREE.SphereGeometry(0.3, 10, 8).translate(0, head, 0), new THREE.MeshBasicMaterial({ color: LAMPS.offColor }));

    // Pools of light lie flat on the ground, tilted to follow the hill.
    const pools = place(
      new THREE.PlaneGeometry(LAMPS.poolSize, LAMPS.poolSize).rotateX(-Math.PI / 2).translate(0, 0.3, 0),
      lightMaterial(THREE.MeshBasicMaterial, { map, color: LAMPS.color }),
      (o, [x, , z]) => {
        const slopeX = (heightAt(x + 1, z) - heightAt(x - 1, z)) / 2, slopeZ = (heightAt(x, z + 1) - heightAt(x, z - 1)) / 2;
        o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-slopeX, 1, -slopeZ).normalize());
      }
    );

    // Halos around the lamp heads always face the camera (points do that by themselves).
    const halo = new THREE.BufferGeometry();
    halo.setAttribute('position', new THREE.Float32BufferAttribute(spots.flatMap(([x, y, z]) => [x, y + head, z]), 3));
    const halos = new THREE.Points(halo, lightMaterial(THREE.PointsMaterial, { map, color: LAMPS.color, size: LAMPS.haloSize, sizeAttenuation: true }));
    halos.raycast = noRaycast;

    return { poles, bulbs, pools, halos };
  }, [m, heightAt]);

  useEffect(() => {
    const off = new THREE.Color(LAMPS.offColor), on = new THREE.Color(LAMPS.color);
    return onNightLevel((level) => {
      lamps.bulbs.material.color.lerpColors(off, on, level);
      lamps.pools.material.opacity = level * LAMPS.poolOpacity;
      lamps.halos.material.opacity = level;
      lamps.pools.visible = lamps.halos.visible = level > 0.01; // nothing to draw in daylight
    });
  }, [lamps]);

  return (
    <group>
      <primitive object={lamps.poles} />
      <primitive object={lamps.bulbs} />
      <primitive object={lamps.pools} />
      <primitive object={lamps.halos} />
    </group>
  );
}
