// The 3D campus: canvas, camera controls and the buttons floating over it.
import { useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { CAMERA, BOUNDS, COLORS } from '../../campus/site.js';
import { useI18n } from '../../i18n/index.jsx';
import Buildings from './Buildings.jsx';
import Site from './Site.jsx';
import ParkingLayer from './ParkingLayer.jsx';

// Camera position for the default view. On screens narrower than the reference
// image (phones), the camera moves back along the same line. Not all the way back
// to fit the full width, which would make the campus tiny: the sides are cropped
// a little and users can pan.
function defaultCameraPosition(aspect) {
  const scale = Math.max(1, (CAMERA.referenceAspect / aspect) ** CAMERA.narrowScreenFit);
  return CAMERA.position.map((p, i) => CAMERA.target[i] + (p - CAMERA.target[i]) * scale);
}

function Controls({ controlsRef }) {
  const { size } = useThree();
  // Computed once on mount, so resizing the window doesn't undo the user's camera moves.
  const [initial] = useState(() => defaultCameraPosition(size.width / size.height));

  return (
    <>
      <PerspectiveCamera makeDefault position={initial} fov={CAMERA.fov} near={5} far={4000} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={CAMERA.target}
        enableDamping
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        minPolarAngle={CAMERA.minPolarAngle}
        maxPolarAngle={CAMERA.maxPolarAngle}
        // Keep the point the camera orbits around inside the scene, so users can't pan away.
        onChange={(e) => {
          const t = e?.target?.target;
          if (!t) return;
          t.x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, t.x));
          t.z = Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, t.z));
          t.y = Math.min(40, Math.max(0, t.y));
        }}
      />
    </>
  );
}

export default function CampusView({ places, allPlaces, selectedPlace, onSelect, onBackgroundClick }) {
  const { t } = useI18n();
  const [showParking, setShowParking] = useState(false);
  const controlsRef = useRef();
  const wrapperRef = useRef();
  // Labels floating over the 3D view are placed in this layer (see .campus-labels).
  const labelsRef = useRef();

  // When a filter or search is active, buildings without matching places are greyed out.
  const activeIds = useMemo(() => {
    if (places.length === allPlaces.length) return null;
    return new Set(places.flatMap((p) => [p.id, p.building].filter(Boolean)));
  }, [places, allPlaces]);

  // The building to highlight: the selected place itself, or the building it's in.
  const selectedId = selectedPlace ? selectedPlace.building || selectedPlace.id : null;

  const selectById = (id) => {
    const place = allPlaces.find((p) => p.id === id);
    if (place) onSelect(place);
  };

  const resetView = () => {
    const controls = controlsRef.current;
    if (!controls) return;
    const { clientWidth, clientHeight } = wrapperRef.current;
    controls.object.position.set(...defaultCameraPosition(clientWidth / clientHeight));
    controls.target.set(...CAMERA.target);
    controls.update();
  };

  return (
    <div className="campus" ref={wrapperRef}>
      <Canvas
        frameloop="demand" // only redraw when something changes: saves battery
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={onBackgroundClick}
      >
        <color attach="background" args={[COLORS.background]} />
        <hemisphereLight args={['#ffffff', '#8a8f7a', 1.6]} />
        <directionalLight position={[120, 200, -80]} intensity={1.6} />
        <Controls controlsRef={controlsRef} />
        <Site labelsRef={labelsRef} />
        <Buildings activeIds={activeIds} selectedId={selectedId} onSelect={selectById} labelsRef={labelsRef} />
        {showParking && <ParkingLayer onSelect={selectById} labelsRef={labelsRef} />}
      </Canvas>
      <div className="campus-labels" ref={labelsRef} />

      <div className="campus-buttons">
        <button
          type="button"
          className={`campus-button ${showParking ? 'active' : ''}`}
          aria-pressed={showParking}
          onClick={() => setShowParking((v) => !v)}
        >
          <span className="parking-p">P</span> {t('parking')}
        </button>
        <button type="button" className="campus-button" onClick={resetView}>
          {t('resetView')}
        </button>
      </div>

      <p className="campus-attribution">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}
