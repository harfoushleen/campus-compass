// The 3D campus: canvas, camera controls, pins and the small buttons floating over it.
// This file (and everything it imports, including Three.js) is loaded separately
// from the rest of the app, so the sidebar appears before the 3D view is ready.
//
// One campus is shown at a time. `campus` picks its model (src/campus/index.js); App remounts
// this component when the campus changes, so nothing is carried over from the other one.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { getModel } from '../../campus/index.js';
import { FLY_DURATION, LABELS } from '../../campus/common.js';
import { centroid } from '../../campus/geometry.js';
import { buildingTop } from '../../campus/details.js';
import { useI18n } from '../../i18n/index.jsx';
import Buildings from './Buildings.jsx';
import Details from './Details.jsx';
import Lamps from './Lamps.jsx';
import Site from './Site.jsx';
import Sea from './Sea.jsx';
import ParkingLayer from './ParkingLayer.jsx';
import OffscreenMarker from './OffscreenMarker.jsx';
import Hangouts from './Hangouts.jsx';
import FacilityPins from './FacilityPins.jsx';
import SceneTheme from './SceneTheme.jsx';
import { ModelContext } from './model.js';
import { groupPins, placeFocus } from '../../campus/pins.js';
import { LabelContext, LabelLayout, createLabelRegistry } from './labels.jsx';

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The default view. On screens narrower than the reference image (phones), the camera moves
// back along the same line. Not all the way back to fit the full width, which would make the
// campus tiny: the sides are cropped a little and users can pan. A campus whose reference
// image is much wider than a phone (Byblos) can give a `narrowTarget`: the point phones look at,
// so the buildings are in the middle instead of the far end of the campus.
function defaultView(m, aspect) {
  const { CAMERA } = m;
  const scale = Math.max(1, (CAMERA.referenceAspect / aspect) ** CAMERA.narrowScreenFit);
  const target = CAMERA.narrowTarget && aspect < CAMERA.narrowBelowAspect ? CAMERA.narrowTarget : CAMERA.target;
  return { target, position: CAMERA.position.map((p, i) => target[i] + (p - CAMERA.target[i]) * scale) };
}

/** Camera view of a ground point [x, z]: looking from the default direction, `distance` metres away. */
function viewOf(m, [x, z], distance) {
  const { CAMERA } = m;
  const dir = new THREE.Vector3(...CAMERA.position).sub(new THREE.Vector3(...CAMERA.target)).normalize();
  const target = [x, m.heightAt(x, z), z];
  return { target, position: [target[0] + dir.x * distance, target[1] + dir.y * distance, target[2] + dir.z * distance] };
}

/** Camera view of one building, looking from the default direction. */
function buildingView(m, id, distance) {
  const b = m.BUILDINGS.find((x) => x.id === id);
  return viewOf(m, centroid(b.parts.flatMap((p) => p.footprint)), distance);
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // ease in-out

function Controls({ m, controlsRef, flyRef }) {
  const { CAMERA, BOUNDS } = m;
  const { size, invalidate } = useThree();
  // Computed once on mount, so resizing the window doesn't undo the user's camera moves.
  const [initial] = useState(() => defaultView(m, size.width / size.height));
  const flight = useRef(null);
  const [minY, maxY] = CAMERA.targetHeight ?? [0, 40]; // how high or low the orbit point may go

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

  // Development only: lets the screenshot scripts set the camera, window.__setCamera([x, y, z, tx, ty, tz]).
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__setCamera = ([x, y, z, tx, ty, tz]) => flyRef.current([x, y, z], [tx, ty, tz]);
    return () => delete window.__setCamera;
  }, [flyRef]);

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
      <PerspectiveCamera makeDefault position={initial.position} fov={CAMERA.fov} near={CAMERA.near ?? 5} far={CAMERA.far ?? 4000} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={initial.target}
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
          t.y = Math.min(maxY, Math.max(minY, t.y));
        }}
      />
    </>
  );
}

/**
 * campus         id of the campus to show ('beirut', 'byblos')
 * places         the places of the open sidebar category (their pins show while nothing is picked)
 * allPlaces      every place on this campus
 * category       the open sidebar category, or null
 * selectedPlace  the picked place: only its pin shows
 * focus          { id, n }: when `n` changes, fly the camera to place `id`
 */
export default function CampusView({ campus, places, allPlaces, category, selectedPlace, focus, theme, onSelect, onBackgroundClick }) {
  const { t, localize } = useI18n();
  const m = useMemo(() => getModel(campus), [campus]);
  const [labelRegistry] = useState(createLabelRegistry);
  const toolbarRef = useRef();
  const [showLabels, setShowLabels] = useState(LABELS.showByDefault);
  const controlsRef = useRef();
  const flyRef = useRef(() => {});
  const wrapperRef = useRef();
  // Labels floating over the 3D view are placed in this layer (see .campus-labels).
  const labelsRef = useRef();

  // Off-screen markers (e.g. "Gezairi →") with the point they track (top of the building).
  const markers = useMemo(
    () =>
      m.OFFSCREEN_MARKERS.map((marker) => {
        const b = m.BUILDINGS.find((x) => x.id === marker.buildingId);
        const [cx, cz] = centroid(b.parts.flatMap((p) => p.footprint));
        return { ...marker, point: [cx, buildingTop(m, b) * 0.6, cz] };
      }),
    [m]
  );
  // One DOM element (and its arrow) per off-screen marker, positioned by <OffscreenMarker>.
  const markerRefs = useRef(markers.map(() => ({ el: { current: null }, arrow: { current: null } })));

  // Pins: none by default. Picking a place shows just its pin; otherwise the open category
  // shows a pin for each of its places (places in the same building share one pin with a count).
  const pinGroups = useMemo(() => {
    const shown = selectedPlace ? [selectedPlace] : category ? places : [];
    return groupPins(m, shown, category);
  }, [m, places, category, selectedPlace]);

  // When a category is open, buildings that hold none of its places are greyed out.
  const activeIds = useMemo(() => {
    if (!category || !places.some((p) => p.building || m.BUILDINGS.some((b) => b.id === p.id))) return null;
    return new Set(places.flatMap((p) => [p.id, p.building].filter(Boolean)));
  }, [m, places, category]);

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
    const view = viewOf(m, centre, Math.min(m.CAMERA.maxFrameDistance ?? 560, Math.max(270, 170 + spread * 2.4)));
    flyRef.current(view.position, view.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // A place was picked in the sidebar or the search: fly to it.
  useEffect(() => {
    if (!focus) return;
    const place = allPlaces.find((p) => p.id === focus.id);
    const spot = place && placeFocus(m, place);
    if (!spot) return;
    const view = viewOf(m, spot, place.building || m.BUILDINGS.some((b) => b.id === place.id) ? 200 : 130);
    flyRef.current(view.position, view.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.n]);

  const defaultView = () => {
    const { clientWidth, clientHeight } = wrapperRef.current;
    const view = defaultView(m, clientWidth / clientHeight);
    flyRef.current(view.position, view.target);
  };

  const goToBuilding = (marker) => {
    const view = buildingView(m, marker.buildingId, marker.viewDistance);
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
        <ModelContext.Provider value={m}>
          <SceneTheme theme={theme} />
          <LabelContext.Provider value={{ registry: labelRegistry, portal: labelsRef }}>
            <Controls m={m} controlsRef={controlsRef} flyRef={flyRef} />
            <Site showLabels={showLabels} />
            <Sea />
            <Details />
            <Lamps />
            <Buildings
              activeIds={activeIds}
              selectedId={selectedId}
              onSelect={selectById}
              showLabels={showLabels}
            />
            <ParkingLayer showUnderground={category === 'parking'} />
            <Hangouts />
            <FacilityPins groups={pinGroups} selectedId={selectedPlace?.id} onSelect={selectById} name={(p) => localize(p.name)} />
            {markers.map((marker, i) => (
              <OffscreenMarker
                key={marker.buildingId}
                point={marker.point}
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
                ...markerRefs.current.map((mk) => mk.el.current),
                ...document.querySelectorAll('.topbar .fab, .topbar .search-box'),
              ]}
            />
          </LabelContext.Provider>
        </ModelContext.Provider>
      </Canvas>
      <div className="campus-labels" ref={labelsRef} />

      {markers.map((marker, i) => (
        <button
          key={marker.buildingId}
          type="button"
          className="offscreen-marker"
          ref={(el) => (markerRefs.current[i].el.current = el)}
          onClick={() => goToBuilding(marker)}
        >
          {t(marker.labelKey)}
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
        {/* Extra camera views some campuses have (Byblos: looking out over the old town and the sea). */}
        {(m.VIEWS ?? []).map((view) => (
          <button key={view.id} type="button" className="campus-button" onClick={() => flyRef.current(view.position, view.target)}>
            {t(view.labelKey)}
          </button>
        ))}
      </div>

      <p className="campus-attribution">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}
