// The 3D campus: canvas, camera controls and the buttons floating over it.
// This file (and everything it imports, including Three.js) is loaded separately
// from the rest of the app, so search and the list appear before the 3D view is ready.
import { useEffect, useMemo, useRef, useState } from 'react';
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
import Hangouts from './Hangouts.jsx';
import FacilityPins from './FacilityPins.jsx';
import { groupPins, placeFocus } from '../../campus/pins.js';
import { LabelContext, LabelLayout, createLabelRegistry } from './labels.jsx';

// Camera position for the default view. On screens narrower than the reference
// image (phones), the camera moves back along the same line. Not all the way back
// to fit the full width, which would make the campus tiny: the sides are cropped
// a little and users can pan.
function defaultCameraPosition(aspect) {
  const scale = Math.max(1, (CAMERA.referenceAspect / aspect) ** CAMERA.narrowScreenFit);
  return CAMERA.position.map((p, i) => CAMERA.target[i] + (p - CAMERA.target[i]) * scale);
}

/**
 * Camera view of a ground point [x, z]: looking from the default direction, `distance` metres away.
 * `shift` moves the aim point toward the viewer, which puts the point higher up on the screen
 * (used on phones, where the details sheet covers the lower part).
 */
function viewOf([x, z], distance, shift = 0) {
  const dir = new THREE.Vector3(...CAMERA.position).sub(new THREE.Vector3(...CAMERA.target)).normalize();
  const flat = new THREE.Vector2(dir.x, dir.z).normalize();
  const target = [x + flat.x * shift, heightAt(x, z), z + flat.y * shift];
  return { target, position: [target[0] + dir.x * distance, target[1] + dir.y * distance, target[2] + dir.z * distance] };
}

/** Camera view of one building, looking from the default direction. */
function buildingView(id, distance) {
  const b = BUILDINGS.find((x) => x.id === id);
  return viewOf(centroid(b.parts.flatMap((p) => p.footprint)), distance);
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

export default function CampusView({ places, allPlaces, category, selectedPlace, onSelect, onBackgroundClick }) {
  const { t, localize } = useI18n();
  const [showParking, setShowParking] = useState(false);
  const [labelRegistry] = useState(createLabelRegistry);
  const toolbarRef = useRef();
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

  // Pins: none by default. A pin appears for the place you picked, and for every place in
  // the category chip that is on (narrowed by the search box, if you typed something).
  // Places in the same building share one pin. The 3D objects (benches, paths...) are always drawn.
  const pinGroups = useMemo(() => {
    const shown = new Map();
    if (category) places.forEach((p) => shown.set(p.id, p));
    if (selectedPlace) shown.set(selectedPlace.id, selectedPlace);
    return groupPins([...shown.values()], category);
  }, [places, category, selectedPlace]);

  // The building to highlight: the selected place itself, or the building it's in.
  const selectedId = selectedPlace ? selectedPlace.building || selectedPlace.id : null;

  // When a category chip is turned on, frame all of its pins so none are off-screen.
  useEffect(() => {
    if (!category || pinGroups.length === 0) return;
    const xs = pinGroups.map((g) => g.anchor[0]), zs = pinGroups.map((g) => g.anchor[2]);
    const centre = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    const view = viewOf(centre, Math.min(520, Math.max(270, 170 + spread * 2.4)));
    flyRef.current(view.position, view.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Fly to the place you picked. Buildings and parking have no pin, so the camera stays put for them.
  // On phones the camera aims a little higher so the place isn't hidden by the details sheet.
  useEffect(() => {
    if (!selectedPlace) return;
    const focus = placeFocus(selectedPlace);
    if (!focus) return;
    const distance = selectedPlace.building ? 200 : 130;
    const narrow = (wrapperRef.current?.clientWidth ?? 1000) < 720;
    const view = viewOf(focus, distance, narrow ? distance * 0.2 : 0);
    flyRef.current(view.position, view.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlace?.id]);

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
        <LabelContext.Provider value={{ registry: labelRegistry, portal: labelsRef }}>
        <Controls controlsRef={controlsRef} flyRef={flyRef} />
        <Site showLabels={showLabels} />
        <Details />
        <Buildings
          activeIds={activeIds}
          selectedId={selectedId}
          onSelect={selectById}
          showLabels={showLabels}
        />
        <ParkingLayer onSelect={selectById} showLayer={showParking} />
        <Hangouts />
        <FacilityPins groups={pinGroups} selectedId={selectedPlace?.id} onSelect={selectById} name={(p) => localize(p.name)} />
        {MARKERS.map((m, i) => (
          <OffscreenMarker
            key={m.buildingId}
            point={m.point}
            elementRef={markerRefs.current[i].el}
            arrowRef={markerRefs.current[i].arrow}
            avoidRef={toolbarRef}
          />
        ))}
        {/* Decides which labels show; keeps them off the toolbar and the off-screen markers. */}
        <LabelLayout
          container={labelsRef}
          obstacles={() => [toolbarRef.current, ...markerRefs.current.map((m) => m.el.current)]}
        />
        </LabelContext.Provider>
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

      {/* Toolbar at the bottom of the 3D view, clear of the tall buildings' labels at the top. */}
      <div className="campus-toolbar" ref={toolbarRef}>
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
