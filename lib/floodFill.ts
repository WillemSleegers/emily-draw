/**
 * Flood Fill Algorithm
 * Fills a region of connected pixels with a new color
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

/**
 * Set pixel color at specific coordinates
 */
export function setPixelColor(
  imageData: ImageData,
  x: number,
  y: number,
  color: RGB
): void {
  const index = (y * imageData.width + x) * 4
  imageData.data[index] = color.r
  imageData.data[index + 1] = color.g
  imageData.data[index + 2] = color.b
  imageData.data[index + 3] = color.a
}

/**
 * Check if two colors are the same (within a tolerance)
 */
export function colorsMatch(color1: RGB, color2: RGB, tolerance = 0): boolean {
  return (
    Math.abs(color1.r - color2.r) <= tolerance &&
    Math.abs(color1.g - color2.g) <= tolerance &&
    Math.abs(color1.b - color2.b) <= tolerance &&
    Math.abs(color1.a - color2.a) <= tolerance
  )
}

/**
 * Flood fill algorithm using stack-based approach (non-recursive)
 * Fills all connected pixels of the same color with a new color
 *
 * @param imageData - Canvas ImageData to modify
 * @param startX - Starting X coordinate
 * @param startY - Starting Y coordinate
 * @param fillColor - Color to fill with
 * @param tolerance - Color matching tolerance (0-255)
 * @returns Modified ImageData
 */
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: RGB,
  tolerance = 10
): ImageData {
  const width = imageData.width
  const height = imageData.height

  // Get the color we're replacing
  const targetColor = getPixelColor(imageData, startX, startY)

  // If target color is same as fill color, no need to fill
  if (colorsMatch(targetColor, fillColor, 0)) {
    return imageData
  }

  // Stack-based flood fill to avoid recursion depth issues
  const stack: Point[] = [{ x: startX, y: startY }]
  // Use Set<number> with linear indices instead of Set<string> for better performance
  // Linear index = y * width + x
  const visited = new Set<number>()

  while (stack.length > 0) {
    const point = stack.pop()!
    const { x, y } = point

    // Skip if out of bounds
    if (x < 0 || x >= width || y < 0 || y >= height) {
      continue
    }

    // Convert to linear index for efficient visited tracking
    const linearIndex = y * width + x
    if (visited.has(linearIndex)) {
      continue
    }
    visited.add(linearIndex)

    // Get current pixel color
    const currentColor = getPixelColor(imageData, x, y)

    // Skip if color doesn't match target
    if (!colorsMatch(currentColor, targetColor, tolerance)) {
      continue
    }

    // Fill this pixel
    setPixelColor(imageData, x, y, fillColor)

    // Add neighboring pixels to stack (4-way connectivity)
    stack.push({ x: x + 1, y })
    stack.push({ x: x - 1, y })
    stack.push({ x, y: y + 1 })
    stack.push({ x, y: y - 1 })
  }

  return imageData
}

/**
 * Optimized scanline flood fill algorithm
 * More efficient for filling large areas
 */
export function scanlineFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: RGB,
  tolerance = 10
): ImageData {
  const width = imageData.width
  const height = imageData.height
  const targetColor = getPixelColor(imageData, startX, startY)

  if (colorsMatch(targetColor, fillColor, 0)) {
    return imageData
  }

  const stack: Point[] = [{ x: startX, y: startY }]
  const visited = new Set<number>()

  while (stack.length > 0) {
    const { x, y } = stack.pop()!

    if (y < 0 || y >= height) continue

    // Find the leftmost pixel in this scanline
    let left = x
    while (
      left > 0 &&
      colorsMatch(getPixelColor(imageData, left - 1, y), targetColor, tolerance)
    ) {
      left--
    }

    // Find the rightmost pixel in this scanline
    let right = x
    while (
      right < width - 1 &&
      colorsMatch(
        getPixelColor(imageData, right + 1, y),
        targetColor,
        tolerance
      )
    ) {
      right++
    }

    // Fill the scanline
    for (let i = left; i <= right; i++) {
      const key = y * width + i
      if (visited.has(key)) continue
      visited.add(key)

      setPixelColor(imageData, i, y, fillColor)

      // Check pixels above and below
      if (
        y > 0 &&
        colorsMatch(getPixelColor(imageData, i, y - 1), targetColor, tolerance)
      ) {
        stack.push({ x: i, y: y - 1 })
      }
      if (
        y < height - 1 &&
        colorsMatch(getPixelColor(imageData, i, y + 1), targetColor, tolerance)
      ) {
        stack.push({ x: i, y: y + 1 })
      }
    }
  }

  return imageData
}
