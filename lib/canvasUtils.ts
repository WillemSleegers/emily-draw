/**
 * Canvas Utilities
 */

/**
 * Convert a client-space position into logical (full-image) pixel coordinates.
 *
 * Takes the container's `DOMRect` rather than the element itself: callers cache
 * the rect for the duration of a stroke, so a fast Apple Pencil stroke doesn't
 * force a layout on every sample.
 */
export function getCanvasCoordinates(
  rect: DOMRect,
  logicalWidth: number,
  logicalHeight: number,
  position: { clientX: number; clientY: number }
): { x: number; y: number } {
  const scaleX = logicalWidth / rect.width;
  const scaleY = logicalHeight / rect.height;

  return {
    x: Math.floor((position.clientX - rect.left) * scaleX),
    y: Math.floor((position.clientY - rect.top) * scaleY),
  };
}
