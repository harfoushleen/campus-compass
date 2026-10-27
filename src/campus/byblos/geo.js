// GPS <-> scene coordinates for the LAU Byblos campus (see ../geo.js).
// The origin is a convenience point about 60 m south of the Main Gate, not an official one.
import { makeGeo } from '../geo.js';

export const { ORIGIN, toLocal, toLatLng } = makeGeo({ lat: 34.1155, lng: 35.6735 });
