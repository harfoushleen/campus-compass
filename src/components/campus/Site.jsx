// Everything around the LAU buildings: ground, streets, neighbouring blocks and gates.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { buildCity, buildPaths, buildStairs, buildStreets, buildSurroundings, buildTerrain, buildWalls } from '../../campus/geometry.js';
import { cityTexture } from './cityTexture.js';
import { LABELS } from '../../campus/common.js';
import { ManagedLabel } from './labels.jsx';
import { useModel } from './model.js';

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const CITY_SECONDS = 0.55; // how long the blocks take to rise out of the ground or sink back

/** The neighbouring blocks. When `show` changes they grow up from the ground (or shrink back into it), then are hidden for good. */
function CityLayer({ show, children }) {
  const group = useRef();
  const t = useRef(show ? 1 : 0); // 0 = flat on the ground and hidden, 1 = full height
  useFrame(({ invalidate }, delta) => {
    const g = group.current;
    if (!g) return;
    const target = show ? 1 : 0;
    if (t.current !== target) {
      t.current = reduceMotion() ? target : Math.min(1, Math.max(0, t.current + Math.sign(target - t.current) * (delta / CITY_SECONDS)));
      if (Math.abs(t.current - target) < 1e-3) t.current = target;
      invalidate(); // keep drawing until it has arrived
    }
    const e = t.current * t.current * (3 - 2 * t.current); // ease in and out
    g.scale.y = Math.max(e, 1e-4);
    g.visible = t.current > 0;
  });
  return (
    <group ref={group}>
      {children}
    </group>
  );
}

export default function Site({ showLabels, showCity = true }) {
  const m = useModel();
  const { COLORS, GATES, heightAt } = m;
  // Each of these is a single merged mesh, so the whole city costs only a few draw calls.
  const terrain = useMemo(() => buildTerrain(m), [m]);
  const streets = useMemo(() => buildStreets(m), [m]);
  const paths = useMemo(() => buildPaths(m), [m]);
  const stairs = useMemo(() => buildStairs(m), [m]);
  const city = useMemo(() => buildCity(m), [m]);
  const surroundings = useMemo(() => (city ? null : buildSurroundings(m)), [m, city]);
  const walls = useMemo(() => buildWalls(m), [m]);
  // Flat sheets over the ground (roads, paths) are pulled a little toward the camera so they never flicker against it (campuses with LAYER_OFFSET).
  const sheet = m.LAYER_OFFSET ? { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } : {};

  return (
    <group>
      {/* Neighbouring buildings ignore pointer events, so taps go to the campus behind them. */}
      <mesh geometry={terrain} raycast={() => null}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={streets} raycast={() => null}>
        <meshLambertMaterial color={COLORS.street} {...sheet} />
      </mesh>
      <mesh geometry={paths} raycast={() => null}>
        <meshLambertMaterial color={COLORS.path} {...sheet} />
      </mesh>
      {walls && (
        <>
          <mesh geometry={walls.face} raycast={() => null}>
            <meshLambertMaterial color={m.WALLS.color} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={walls.top} raycast={() => null}>
            <meshLambertMaterial color={m.WALLS.cap} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      {stairs && (
        <mesh geometry={stairs} raycast={() => null}>
          <meshLambertMaterial color={COLORS.stairs} />
        </mesh>
      )}
      <CityLayer show={showCity}>
      {city && (
        <>
          <mesh geometry={city.walls} raycast={() => null}>
            <meshLambertMaterial vertexColors map={cityTexture()} />
          </mesh>
          <mesh geometry={city.roofs} raycast={() => null}>
            <meshLambertMaterial vertexColors />
          </mesh>
        </>
      )}
      {surroundings && (
        <mesh geometry={surroundings} raycast={() => null}>
          <meshLambertMaterial color={COLORS.surrounding} />
        </mesh>
      )}
      </CityLayer>

      {GATES.map((gate) => {
        const [x, z] = gate.position;
        const y = heightAt(x, z);
        return (
          <group key={gate.id}>
            <group position={[x, y, z]}>
              {/* Small gatehouse with a red pyramid roof. */}
              <mesh position={[0, 1.75, 0]} raycast={() => null}>
                <boxGeometry args={[4.5, 3.5, 4.5]} />
                <meshLambertMaterial color="#d8cbb4" />
              </mesh>
              <mesh position={[0, 4.6, 0]} rotation={[0, Math.PI / 4, 0]} raycast={() => null}>
                <coneGeometry args={[3.9, 2.2, 4]} />
                <meshLambertMaterial color="#c4502e" />
              </mesh>
            </group>
            {showLabels && (
              <ManagedLabel position={[x, y + gate.labelHeight, z]} priority={LABELS.gatePriority}>
                <div className="gate-label">{gate.name}</div>
              </ManagedLabel>
            )}
          </group>
        );
      })}
    </group>
  );
}
