// Everything around the LAU buildings: ground, streets, neighbouring blocks and gates.
import { useMemo } from 'react';
import { buildPaths, buildStairs, buildStreets, buildSurroundings, buildTerrain } from '../../campus/geometry.js';
import { LABELS } from '../../campus/common.js';
import { ManagedLabel } from './labels.jsx';
import { useModel } from './model.js';

export default function Site({ showLabels }) {
  const m = useModel();
  const { COLORS, GATES, heightAt } = m;
  // Each of these is a single merged mesh, so the whole city costs only a few draw calls.
  const terrain = useMemo(() => buildTerrain(m), [m]);
  const streets = useMemo(() => buildStreets(m), [m]);
  const paths = useMemo(() => buildPaths(m), [m]);
  const stairs = useMemo(() => buildStairs(m), [m]);
  const surroundings = useMemo(() => buildSurroundings(m), [m]);

  return (
    <group>
      {/* Neighbouring buildings ignore pointer events, so taps go to the campus behind them. */}
      <mesh geometry={terrain} raycast={() => null}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={streets} raycast={() => null}>
        <meshLambertMaterial color={COLORS.street} />
      </mesh>
      <mesh geometry={paths} raycast={() => null}>
        <meshLambertMaterial color={COLORS.path} />
      </mesh>
      {stairs && (
        <mesh geometry={stairs} raycast={() => null}>
          <meshLambertMaterial color={COLORS.stairs} />
        </mesh>
      )}
      {surroundings && (
        <mesh geometry={surroundings} raycast={() => null}>
          <meshLambertMaterial color={COLORS.surrounding} />
        </mesh>
      )}

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
