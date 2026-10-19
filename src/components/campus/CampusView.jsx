// The 3D campus: canvas, camera controls and the buttons floating over it.
// This file (and everything it imports, including Three.js) is loaded separately
// from the rest of the app, so search and the list appear before the 3D view is ready.
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { BUILDINGS } from '../../campus/buildings.js';
import { CAMERA, BOUNDS, COLORS, FLY_DURATION, LABELS, OFFSCREEN_MARKERS, heightAt } from '../../campus/site.js';
import { centroid } from '../../campus/geometry.js';
import { buildingTop } from '../../campus/details.js';
import { useI18n } from '../../i18n/index.jsx';
import Buildings from './Buildings.jsx';
import Details from './Details.jsx';
import Site from './Site.jsx';
import ParkingLayer from './ParkingLayer.jsx';
import OffscreenMarker from './OffscreenMarker.jsx';

// Camera position for the default view. On screens narrower than the reference
// image (phones), the camera moves back along the same line. Not all the way back
// to fit the full width, which would make the campus tiny: the sides are cropped
// a little and users can pan.
function defaultCameraPosition(aspect) {
  const scale = Math.max(1, (CAMERA.referenceAspect / aspect) ** CAMERA.narrowScreenFit);
  return CAMERA.position.map((p, i) => CAMERA.target[i] + (p - CAMERA.target[i]) * scale);
}

/** Camera view of one building: looking from the default direction, `distance` metres away. */
function buildingView(id, distance) {
  const b = BUILDINGS.find((x) => x.id === id);
  const [cx, cz] = centroid(b.parts.flatMap((p) => p.footprint));
  // Aim at the ground below the building so it shows in the upper part of the
  // screen, above the details sheet.
  const target = [cx, heightAt(cx, cz), cz];
  const dir = new THREE.Vector3(...CAMERA.position).sub(new THREE.Vector3(...CAMERA.target)).normalize();
  return { target, position: [target[0] + dir.x * distance, target[1] + dir.y * distance, target[2] + dir.z * distance] };
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // ease in-out

function Controls({ controlsRef, flyRef }) {
  const { size, invalidate } = useThree();
  // Computed once on mount, so resizing the window doesn't undo the user's camera moves.
  const [initial] = useState(() => defaultCameraPosition(size.width / size.height));
  const flight = useRef(null);

  // flyRef.current(position, target): smoothly moves the camera to a new view.
  flyRef.current = (position, target) => {
    const controls = controlsRef.current;
    if (!controls) return;
    flight.current = {
      start: performance.now(),
      fromPos: controls.object.position.clone(),
      fromTarget: controls.target.clone(),
      toPos: new THREE.Vector3(...position),
      toTarget: new THREE.Vector3(...target),
    };
    invalidate();
  };

  useFrame(() => {
    const f = flight.current, controls = controlsRef.current;
    if (!f || !controls) return;
    const t = Math.min(1, (performance.now() - f.start) / (FLY_DURATION * 1000));
    controls.object.position.lerpVectors(f.fromPos, f.toPos, ease(t));
    controls.target.lerpVectors(f.fromTarget, f.toTarget, ease(t));
    controls.update();
    if (t < 1) invalidate(); // keep drawing until the flight ends
    else flight.current = null;
  });

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
        onStart={() => (flight.current = null)} // a touch cancels any camera flight
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

// Off-screen markers with the point they track (top of the building).
const MARKERS = OFFSCREEN_MARKERS.map((m) => {
  const b = BUILDINGS.find((x) => x.id === m.buildingId);
  const [cx, cz] = centroid(b.parts.flatMap((p) => p.footprint));
  return { ...m, point: [cx, buildingTop(b) * 0.6, cz] };
});

export default function CampusView({ places, allPlaces, selectedPlace, onSelect, onBackgroundClick }) {
  const { t } = useI18n();
  const [showParking, setShowParking] = useState(false);
  const [showLabels, setShowLabels] = useState(LABELS.showByDefault);
  const controlsRef = useRef();
  const flyRef = useRef(() => {});
  const wrapperRef = useRef();
  // Labels floating over the 3D view are placed in this layer (see .campus-labels).
  const labelsRef = useRef();
  // One DOM element (and its arrow) per off-screen marker, positioned by <OffscreenMarker>.
  const markerRefs = useRef(MARKERS.map(() => ({ el: { current: null }, arrow: { current: null } })));

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

  const defaultView = () => {
    const { clientWidth, clientHeight } = wrapperRef.current;
    flyRef.current(defaultCameraPosition(clientWidth / clientHeight), CAMERA.target);
  };

  const goToBuilding = (marker) => {
    const view = buildingView(marker.buildingId, marker.viewDistance);
    flyRef.current(view.position, view.target);
    selectById(marker.buildingId);
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
        <Controls controlsRef={controlsRef} flyRef={flyRef} />
        <Site labelsRef={labelsRef} />
        <Details />
        <Buildings
          activeIds={activeIds}
          selectedId={selectedId}
          onSelect={selectById}
          labelsRef={labelsRef}
          showLabels={showLabels}
        />
        {showParking && <ParkingLayer onSelect={selectById} labelsRef={labelsRef} />}
        {MARKERS.map((m, i) => (
          <OffscreenMarker key={m.buildingId} point={m.point} elementRef={markerRefs.current[i].el} arrowRef={markerRefs.current[i].arrow} />
        ))}
      </Canvas>
      <div className="campus-labels" ref={labelsRef} />

      {MARKERS.map((m, i) => (
        <button
          key={m.buildingId}
          type="button"
          className="offscreen-marker"
          ref={(el) => (markerRefs.current[i].el.current = el)}
          onClick={() => goToBuilding(m)}
        >
          {t(m.labelKey)}
          <span className="offscreen-arrow" ref={(el) => (markerRefs.current[i].arrow.current = el)} aria-hidden="true">
            →
          </span>
        </button>
      ))}

      <div className="campus-buttons">
        <button
          type="button"
          className={`campus-button ${showParking ? 'active' : ''}`}
          aria-pressed={showParking}
          onClick={() => setShowParking((v) => !v)}
        >
          <span className="parking-p">P</span> {t('parking')}
        </button>
        <button
          type="button"
          className={`campus-button ${showLabels ? 'active' : ''}`}
          aria-pressed={showLabels}
          onClick={() => setShowLabels((v) => !v)}
        >
          {t('labels')}
        </button>
        <button type="button" className="campus-button" onClick={defaultView}>
          {t('resetView')}
        </button>
      </div>

      <p className="campus-attribution">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}
