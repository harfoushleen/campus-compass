// GPS <-> scene coordinates for the LAU Beirut campus (see ../geo.js).
import { makeGeo } from '../geo.js';

export const { ORIGIN, toLocal, toLatLng } = makeGeo({ lat: 33.893, lng: 35.4781 });
