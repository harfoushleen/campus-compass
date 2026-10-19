// Everything around the LAU buildings: ground, streets, neighbouring blocks and gates.
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { buildStreets, buildSurroundings, buildTerrain } from '../../campus/geometry.js';
import { COLORS, GATES, heightAt } from '../../campus/site.js';

export default function Site({ labelsRef }) {
  // Each of these is a single merged mesh, so the whole city costs only 3 draw calls.
  const terrain = useMemo(() => buildTerrain(), []);
  const streets = useMemo(() => buildStreets(), []);
  const surroundings = useMemo(() => buildSurroundings(), []);

  return (
    <group>
      {/* Neighbouring buildings ignore pointer events, so taps go to the campus behind them. */}
      <mesh geometry={terrain} raycast={() => null}>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={streets} raycast={() => null}>
        <meshLambertMaterial color={COLORS.street} />
      </mesh>
      <mesh geometry={surroundings} raycast={() => null}>
        <meshLambertMaterial color={COLORS.surrounding} />
      </mesh>

      {GATES.map((gate) => {
        const [x, z] = gate.position;
        const y = heightAt(x, z);
        return (
          <group key={gate.id} position={[x, y, z]}>
            <mesh position={[0, 2, 0]} raycast={() => null}>
              <boxGeometry args={[5, 4, 5]} />
              <meshLambertMaterial color="#c4502e" />
            </mesh>
            <Html portal={labelsRef} position={[0, gate.labelHeight, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
              <div className="gate-label">{gate.name}</div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
