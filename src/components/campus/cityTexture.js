// The window pattern of the neighbouring city blocks: one cell = one window bay (3.6 m wide) on one floor (3.2 m high).
// White wall with a grey window, so the colour of each block tints it (vertex colours, see buildCity in campus/geometry.js).
import * as THREE from 'three';

let texture;
export function cityTexture() {
  if (texture) return texture;
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#9aa1a8'; // the window
  g.fillRect(size * 0.2, size * 0.28, size * 0.6, size * 0.46);
  g.fillStyle = '#e6e8ea'; // a lighter sill under it
  g.fillRect(size * 0.2, size * 0.74, size * 0.6, size * 0.06);
  texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
