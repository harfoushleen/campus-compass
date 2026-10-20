// The 3D campus: canvas, camera controls, pins and the small buttons floating over it.
// This file (and everything it imports, including Three.js) is loaded separately
// from the rest of the app, so the sidebar appears before the 3D view is ready.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { BUILDINGS } from '../../campus/buildings.js';
import { CAMERA, BOUNDS, FLY_DURATION, LABELS, OFFSCREEN_MARKERS, heightAt } from '../../campus/site.js';
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
import SceneTheme from './SceneTheme.jsx';
import { groupPins, placeFocus } from '../../campus/pins.js';
import { LabelContext, LabelLayout, createLabelRegistry } from './labels.jsx';

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Camera position for the default view. On screens narrower than the reference
// image (phones), the camera moves back along the same line. Not all the way back
// to fit the full width, which would make the campus tiny: the sides are cropped
// a little and users can pan.
function defaultCameraPosition(aspect) {
  const scale = Math.max(1, (CAMERA.referenceAspect / aspect) ** CAMERA.narrowScreenFit);
  return CAMERA.position.map((p, i) => CAMERA.target[i] + (p - CAMERA.target[i]) * scale);
}

/** Camera view of a ground point [x, z]: looking from the default direction, `distance` metres away. */
function viewOf([x, z], distance) {
  const dir = new THREE.Vector3(...CAMERA.position).sub(new THREE.Vector3(...CAMERA.target)).normalize();
  const target = [x, heightAt(x, z), z];
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
      duration: reduceMotion() ? 1 : FLY_DURATION * 1000, // "reduce motion": jump straight there
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
    const t = Math.min(1, (performance.now() - f.start) / f.duration);
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

/**
 * places         the places of the open sidebar category (their pins show while nothing is picked)
 * allPlaces      every place on this campus
 * category       the open sidebar category, or null
 * selectedPlace  the picked place: only its pin shows
 * focus          { id, n }: when `n` changes, fly the camera to place `id`
 */
export default function CampusView({ places, allPlaces, category, selectedPlace, focus, theme, onSelect, onBackgroundClick }) {
  const { t, localize } = useI18n();
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

  // Pins: none by default. Picking a place shows just its pin; otherwise the open category
  // shows a pin for each of its places (places in the same building share one pin with a count).
  const pinGroups = useMemo(() => {
    const shown = selectedPlace ? [selectedPlace] : category ? places : [];
    return groupPins(shown, category);
  }, [places, category, selectedPlace]);

  // When a category is open, buildings that hold none of its places are greyed out.
  const activeIds = useMemo(() => {
    if (!category || !places.some((p) => p.building || BUILDINGS.some((b) => b.id === p.id))) return null;
    return new Set(places.flatMap((p) => [p.id, p.building].filter(Boolean)));
  }, [places, category]);

  // The building to highlight: the selected place itself, or the building it's in.
  const selectedId = selectedPlace ? selectedPlace.building || selectedPlace.id : null;

  const selectById = (id) => {
    const place = allPlaces.find((p) => p.id === id);
    if (place) onSelect(place);
  };

  // A category was opened: frame all of its pins so none are off-screen.
  useEffect(() => {
    if (!category || selectedPlace || pinGroups.length === 0) return;
    const xs = pinGroups.map((g) => g.anchor[0]), zs = pinGroups.map((g) => g.anchor[2]);
    const centre = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    const view = viewOf(centre, Math.min(560, Math.max(270, 170 + spread * 2.4)));
    flyRef.current(view.position, view.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // A place was picked in the sidebar or the search: fly to it.
  useEffect(() => {
    if (!focus) return;
    const place = allPlaces.find((p) => p.id === focus.id);
    const spot = place && placeFocus(place);
    if (!spot) return;
    const view = viewOf(spot, place.building || BUILDINGS.some((b) => b.id === place.id) ? 200 : 130);
    flyRef.current(view.position, view.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.n]);

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
        <SceneTheme theme={theme} />
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
        <ParkingLayer showUnderground={category === 'parking'} />
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
        {/* Decides which labels show; keeps them off the toolbar, the top buttons and the off-screen markers. */}
        <LabelLayout
          container={labelsRef}
          obstacles={() => [
            toolbarRef.current,
            ...markerRefs.current.map((m) => m.el.current),
            ...document.querySelectorAll('.topbar .fab, .topbar .search-box'),
          ]}
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
