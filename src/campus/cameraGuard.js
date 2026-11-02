// Keeps the 3D camera, and the point it orbits around, from going under the ground.
// Used on every camera move (orbit, pan, zoom, camera flights) for every campus: it only needs the model's `heightAt`.
//
// Nothing is "undone": the camera is only ever pushed up. Because the ground height is continuous, the camera slides
// along a slope instead of jumping, and the controls re-read the camera position on their next update, so nothing fights.

/** Metres the camera stays above the ground below it (more than the near plane, so the ground never clips away at the bottom of the view). */
export const CAMERA_CLEARANCE = 6;
/** The ground is also checked this far around the camera, so a hill beside it doesn't cut into the view. */
const SIDE_REACH = 4;

/** The highest ground at a point and 4 points `SIDE_REACH` m around it. */
export function groundAround(heightAt, x, z) {
  return Math.max(
    heightAt(x, z),
    heightAt(x + SIDE_REACH, z),
    heightAt(x - SIDE_REACH, z),
    heightAt(x, z + SIDE_REACH),
    heightAt(x, z - SIDE_REACH)
  );
}

/**
 * Pushes the camera and its orbit target up where they are under the ground. Both are { x, y, z } (Three.js vectors).
 * - A target under the ground rises to it, and the camera rises by the same amount, so the view keeps its shape
 *   (panning uphill carries the camera up the slope).
 * - A camera lower than `clearance` above the ground rises to that height and keeps looking at the target.
 * Returns true if anything moved.
 */
export function keepAboveGround(heightAt, camera, target, clearance = CAMERA_CLEARANCE) {
  let moved = false;
  const lift = heightAt(target.x, target.z) - target.y;
  if (lift > 0) {
    target.y += lift;
    camera.position.y += lift;
    moved = true;
  }
  const need = groundAround(heightAt, camera.position.x, camera.position.z) + clearance - camera.position.y;
  if (need > 0) {
    camera.position.y += need;
    camera.lookAt?.(target.x, target.y, target.z);
    moved = true;
  }
  return moved;
}
