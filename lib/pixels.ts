/**
 * Pixel access helpers and shared geometry / color types.
 */

export interface RGB {
  r: number
  g: number
  b: number
  a: number
}

export interface Point {
  x: number
  y: number
}

/**
 * Get pixel color at specific coordinates
 */
export function getPixelColor(imageData: ImageData, x: number, y: number): RGB {
  const index = (y * imageData.width + x) * 4
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
    a: imageData.data[index + 3],
  }
}
