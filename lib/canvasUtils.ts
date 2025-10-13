/**
 * Canvas Utilities
 * Helper functions for canvas operations
 */

import type { RGB } from "./floodFill";

/**
 * Get mouse coordinates relative to canvas
 */
export function getCanvasCoordinates(
  canvas: HTMLCanvasElement,
  event: MouseEvent | React.MouseEvent | PointerEvent | React.PointerEvent
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: Math.floor((event.clientX - rect.left) * scaleX),
    y: Math.floor((event.clientY - rect.top) * scaleY),
  };
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255,
      }
    : { r: 0, g: 0, b: 0, a: 255 };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(rgb: RGB): string {
  return (
    "#" +
    [rgb.r, rgb.g, rgb.b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Check if a pixel is part of a boundary (dark/black line)
 */
export function isBoundaryPixel(
  color: RGB,
  threshold = 128
): boolean {
  // Consider a pixel a boundary if it's darker than the threshold
  const brightness = (color.r + color.g + color.b) / 3;
  return brightness < threshold;
}

/**
 * Check if a pixel is within canvas bounds
 */
export function isInBounds(
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}
