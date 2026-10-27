// The 3D campus models, one per campus. A model is everything the 3D scene needs to draw a campus:
//
//   BUILDINGS, STYLES, ...     from <campus>/buildings.js (footprints, floors, colours)
//   heightAt, GATES, PARKING,  from <campus>/site.js (terrain, gates, parking, camera, colours...)
//   CAMERA, ...
//   osm                        <campus>/osm-surroundings.json (roads, and neighbouring buildings if drawn)
//   geo                        <campus>/geo.js (GPS <-> scene coordinates)
//
// The code that turns a model into 3D shapes (geometry.js, details.js, pins.js and src/components/campus/)
// is shared: it takes a model and never mentions a campus by name. To add a campus, make a folder with
// the same files and add it here.
import * as beirutBuildings from './beirut/buildings.js';
import * as beirutSite from './beirut/site.js';
import * as beirutGeo from './beirut/geo.js';
import beirutOsm from './beirut/osm-surroundings.json';
import * as byblosBuildings from './byblos/buildings.js';
import * as byblosSite from './byblos/site.js';
import * as byblosGeo from './byblos/geo.js';
import byblosOsm from './byblos/osm-surroundings.json';

const MODELS = {
  beirut: { id: 'beirut', ...beirutBuildings, ...beirutSite, osm: beirutOsm, geo: beirutGeo },
  byblos: { id: 'byblos', ...byblosBuildings, ...byblosSite, osm: byblosOsm, geo: byblosGeo },
};

/** The 3D model of a campus ('beirut' or 'byblos'). */
export const getModel = (id) => MODELS[id];
