// The 3D canvas is always as wide as the whole screen. On wide screens the sidebar covers its start edge, and the map
// (.content) is shifted over to make room (see .campus in styles.css), so the canvas never has to be resized when the sidebar
// opens or closes. This says which part of the canvas, in px from its start, is actually visible.

/** [from, to] of the canvas that is on screen: the whole canvas, or what the sidebar leaves. */
export function visibleRange(canvas, width) {
  const campus = canvas?.closest?.('.campus'), content = canvas?.closest?.('.content');
  if (!campus || !content) return [0, width];
  const from = Math.max(0, -campus.offsetLeft); // layout position: not moved by the slide animation
  return [from, Math.min(width, from + content.clientWidth)];
}
