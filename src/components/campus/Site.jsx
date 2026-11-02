// Everything around the LAU buildings: ground, streets, neighbouring blocks and gates.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { buildCity, buildPaths, buildStairs, buildStreets, buildSurroundings, buildTerrain, buildWalls } from '../../campus/geometry.js';
import { cityTexture } from './cityTexture.js';
import { LABELS } from '../../campus/common.js';
import { ManagedLabel } from './labels.jsx';
import { useModel } from './model.js';

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const CITY_SECONDS = 0.55; // how long the blocks take to rise out of the ground or sink back

/**
 * The neighbouring blocks. When `show` changes they grow up from the ground (or shrink back into it), then are hidden for good.
 * Timed with the clock, not with frame deltas: the canvas only draws when asked, so the first delta after an idle spell is huge.
 */
function CityLayer({ show, children }) {
  const group = useRef();
  const invalidate = useThree((state) => state.invalidate);
  const level = useRef(show ? 1 : 0); // 0 = flat on the ground and hidden, 1 = full height
  const move = useRef(null); // { from, to, start, seconds } while it is moving

  // A change of `show` is not a change of anything in the scene, so ask for a redraw ourselves.
  useEffect(() => {
    const to = show ? 1 : 0, from = level.current;
    if (from === to) return;
    move.current = { from, to, start: performance.now(), seconds: reduceMotion() ? 0.001 : CITY_SECONDS * Math.abs(to - from) };
    invalidate();
  }, [show, invalidate]);

  useFrame(({ invalidate: again }) => {
    const g = group.current;
    if (!g) return;
    const mv = move.current;
    if (mv) {
      const k = Math.min(1, (performance.now() - mv.start) / (mv.seconds * 1000));
      level.current = mv.from + (mv.to - mv.from) * k;
      if (k < 1) again(); // keep drawing until it has arrived
      else move.current = null;
    }
    const x = level.current, eased = x * x * (3 - 2 * x); // ease in and out
    g.scale.y = Math.max(eased, 1e-4);
    g.visible = x > 0;
  });
  return <group ref={group}>{children}</group>;
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
