/**
 * Canvas Utilities
 * Helper functions for canvas operations
 */

import type { RGB } from "./pixels";

/**
 * Get pointer coordinates relative to an element, in logical (full-image) pixels.
 *
 * Layer canvases are now sized to their region's bounding box, so coordinates
 * must be derived from the full-size container element plus the logical image
 * dimensions rather than from any individual canvas.
 */
export function getCanvasCoordinates(
  element: HTMLElement,
  logicalWidth: number,
  logicalHeight: number,
  event: MouseEvent | React.MouseEvent | PointerEvent | React.PointerEvent
): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const scaleX = logicalWidth / rect.width;
  const scaleY = logicalHeight / rect.height;

  return {
    x: Math.floor((event.clientX - rect.left) * scaleX),
    y: Math.floor((event.clientY - rect.top) * scaleY),
  };
}

/**
 * Check if a pixel is part of a boundary (dark/black line)
 */
export function isBoundaryPixel(color: RGB, threshold = 128): boolean {
  // Consider a pixel a boundary if it's darker than the threshold
  const brightness = (color.r + color.g + color.b) / 3;
  return brightness < threshold;
}
