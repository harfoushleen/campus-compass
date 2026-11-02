// The 3D scene's campus model (buildings, terrain, gates, camera... of the campus being shown),
// handed down to every 3D component. See src/campus/index.js for how a model is put together.
import { createContext, useContext } from 'react';

export const ModelContext = createContext(null);
export const useModel = () => useContext(ModelContext);
