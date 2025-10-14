/**
 * Region Detection System
 * Identifies and maps distinct bounded regions in an image
 */

import { getPixelColor, type Point } from "./floodFill";
import { isBoundaryPixel } from "./canvasUtils";

export interface RegionMap {
  width: number;
  height: number;
  regionCount: number;
  // 2D array: regionMap[y][x] = region ID (or -1 for boundary, 0 for unassigned)
  pixelToRegion: number[][];
}

/**
 * Detect all regions in an image
 * A region is a connected area of non-boundary pixels
 */
export function detectRegions(
  imageData: ImageData,
  boundaryThreshold = 128,
  minRegionSize = 10
): RegionMap {
  const width = imageData.width;
  const height = imageData.height;

  // Initialize pixel-to-region map
  // -1 = boundary pixel, 0 = unassigned, >0 = region ID
  const pixelToRegion: number[][] = Array(height)
    .fill(0)
    .map(() => Array(width).fill(0));

  // Mark boundary pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = getPixelColor(imageData, x, y);
      if (isBoundaryPixel(color, boundaryThreshold)) {
        pixelToRegion[y][x] = -1;
      }
    }
  }

  // Find all regions using flood fill
  let regionCount = 0;
  let currentRegionId = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip if already assigned or is a boundary
      if (pixelToRegion[y][x] !== 0) continue;

      // Found a new region - flood fill to find all pixels in this region
      const regionPixels = floodFillRegion(
        imageData,
        pixelToRegion,
        x,
        y,
        currentRegionId
      );

      // Only keep regions above minimum size
      if (regionPixels.length >= minRegionSize) {
        regionCount++;
        currentRegionId++;
      } else {
        // Mark small regions as boundary to ignore them
        for (const pixel of regionPixels) {
          pixelToRegion[pixel.y][pixel.x] = -1;
        }
      }
    }
  }

  return {
    width,
    height,
    regionCount,
    pixelToRegion,
  };
}

/**
 * Flood fill to identify all pixels in a region
 */
function floodFillRegion(
  imageData: ImageData,
  pixelToRegion: number[][],
  startX: number,
  startY: number,
  regionId: number
): Point[] {
  const width = imageData.width;
  const height = imageData.height;
  const pixels: Point[] = [];
  const stack: Point[] = [{ x: startX, y: startY }];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;

    // Skip if out of bounds
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    // Skip if this pixel is already assigned or is a boundary
    if (pixelToRegion[y][x] !== 0) continue;

    // Add to region
    pixels.push({ x, y });
    pixelToRegion[y][x] = regionId;

    // Add neighbors
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  return pixels;
}

/**
 * Get region ID at specific coordinates
 */
export function getRegionAt(
  regionMap: RegionMap,
  x: number,
  y: number
): number {
  // Ensure coordinates are integers
  x = Math.round(x);
  y = Math.round(y);

  // Check for NaN
  if (isNaN(x) || isNaN(y)) {
    return 0;
  }

  if (x < 0 || x >= regionMap.width || y < 0 || y >= regionMap.height) {
    return 0;
  }

  // Extra safety check for array access
  if (!regionMap.pixelToRegion[y]) {
    return 0;
  }

  return regionMap.pixelToRegion[y][x];
}

/**
 * Get region ID at coordinates with boundary tolerance
 * If the pixel is a boundary (-1), check nearby pixels to see if they belong to a region
 * This allows drawing slightly onto boundary lines
 */
export function getRegionAtWithTolerance(
  regionMap: RegionMap,
  x: number,
  y: number,
  targetRegionId: number,
  tolerance = 2
): number {
  // Ensure coordinates are integers
  x = Math.round(x);
  y = Math.round(y);

  const regionId = getRegionAt(regionMap, x, y);

  // If we're already in a region, return it
  if (regionId > 0) {
    return regionId;
  }

  // If we're on a boundary (-1), check nearby pixels
  if (regionId === -1) {
    // Check pixels within tolerance distance
    for (let dy = -tolerance; dy <= tolerance; dy++) {
      for (let dx = -tolerance; dx <= tolerance; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nearbyX = x + dx;
        const nearbyY = y + dy;

        // Skip if out of bounds
        if (nearbyX < 0 || nearbyX >= regionMap.width ||
            nearbyY < 0 || nearbyY >= regionMap.height) {
          continue;
        }

        const nearbyRegionId = getRegionAt(regionMap, nearbyX, nearbyY);

        // If we find the target region nearby, treat this boundary pixel as part of it
        if (nearbyRegionId === targetRegionId) {
          return targetRegionId;
        }
      }
    }
  }

  return regionId;
}
