/**
 * Region Detection System
 * Identifies and maps distinct bounded regions in an image
 */

import { getPixelColor, type Point } from "./pixels";
import { isBoundaryPixel } from "./canvasUtils";

export interface RegionMap {
  width: number;
  height: number;
  regionCount: number;
  /**
   * Flat width*height map: index `y * width + x` holds the region ID.
   * -1 = boundary pixel, 0 = unassigned, >0 = region ID.
   *
   * A flat `Int32Array` (rather than `number[][]`) is cheaper to allocate,
   * faster to scan, and can be transferred to a Web Worker later with no
   * structured clone.
   */
  pixelToRegion: Int32Array;
}

/**
 * Detect all regions in an image
 * A region is a connected area of non-boundary pixels
 */
export function detectRegions(
  imageData: ImageData,
  boundaryThreshold = 128,
  minRegionSize = 10,
  dilationRadius = 2
): RegionMap {
  const width = imageData.width;
  const height = imageData.height;

  // Flat pixel-to-region map (zero-initialised, so every pixel starts as
  // unassigned). -1 = boundary, 0 = unassigned, >0 = region ID.
  const pixelToRegion = new Int32Array(width * height);

  // Mark boundary pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = getPixelColor(imageData, x, y);
      if (isBoundaryPixel(color, boundaryThreshold)) {
        pixelToRegion[y * width + x] = -1;
      }
    }
  }

  // Find all regions using flood fill
  let regionCount = 0;
  let currentRegionId = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip if already assigned or is a boundary
      if (pixelToRegion[y * width + x] !== 0) continue;

      // Found a new region - flood fill to find all pixels in this region
      const regionPixels = floodFillRegion(
        pixelToRegion,
        width,
        height,
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
          pixelToRegion[pixel.y * width + pixel.x] = -1;
        }
      }
    }
  }

  // Grow regions into the outline so colored strokes meet it (no white halo).
  if (dilationRadius > 0) {
    dilateRegions(pixelToRegion, width, height, dilationRadius);
  }

  return {
    width,
    height,
    regionCount,
    pixelToRegion,
  };
}

/**
 * Grow every region a few pixels into the surrounding boundary.
 *
 * Boundary pixels (the dark outline, including its anti-aliased fringe) belong
 * to no region, so colored strokes would otherwise stop just short of the
 * outline and leave a thin white halo once the outline overlay is drawn on
 * top. A multi-source BFS lets each region claim nearby boundary pixels;
 * pixels between two regions go to whichever region reaches them first, so
 * regions meet under the outline without ever overlapping.
 */
function dilateRegions(
  pixelToRegion: Int32Array,
  width: number,
  height: number,
  radius: number
): void {
  let frontier = buildDilationFrontier(pixelToRegion, width, height);
  for (let r = 0; r < radius && frontier.length > 0; r++) {
    frontier = expandDilationFrontier(pixelToRegion, frontier, width, height);
  }
}

function buildDilationFrontier(
  pixelToRegion: Int32Array,
  width: number,
  height: number
): number[] {
  const frontier: number[] = [];
  for (let i = 0; i < pixelToRegion.length; i++) {
    if (pixelToRegion[i] > 0 && bordersAnyBoundary(pixelToRegion, i, width, height)) {
      frontier.push(i);
    }
  }
  return frontier;
}

function bordersAnyBoundary(
  pixelToRegion: Int32Array,
  i: number,
  width: number,
  height: number
): boolean {
  const x = i % width;
  const y = (i / width) | 0;
  return (
    (x > 0 && pixelToRegion[i - 1] === -1) ||
    (x < width - 1 && pixelToRegion[i + 1] === -1) ||
    (y > 0 && pixelToRegion[i - width] === -1) ||
    (y < height - 1 && pixelToRegion[i + width] === -1)
  );
}

// Expand one pixel ring per round. A boundary pixel is claimed by the first
// frontier pixel to reach it (the `=== -1` check), so regions never overlap.
function expandDilationFrontier(
  pixelToRegion: Int32Array,
  frontier: number[],
  width: number,
  height: number
): number[] {
  const next: number[] = [];
  for (const i of frontier) {
    const region = pixelToRegion[i];
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0 && pixelToRegion[i - 1] === -1) { pixelToRegion[i - 1] = region; next.push(i - 1); }
    if (x < width - 1 && pixelToRegion[i + 1] === -1) { pixelToRegion[i + 1] = region; next.push(i + 1); }
    if (y > 0 && pixelToRegion[i - width] === -1) { pixelToRegion[i - width] = region; next.push(i - width); }
    if (y < height - 1 && pixelToRegion[i + width] === -1) { pixelToRegion[i + width] = region; next.push(i + width); }
  }
  return next;
}

/**
 * Flood fill to identify all pixels in a region.
 *
 * No separate `visited` set is needed: `pixelToRegion` is written the moment a
 * pixel is claimed, so the `!== 0` check below already rejects boundaries and
 * pixels claimed earlier in this same fill (including repeated stack entries
 * for the same pixel).
 */
function floodFillRegion(
  pixelToRegion: Int32Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  regionId: number
): Point[] {
  const pixels: Point[] = [];
  const stack: Point[] = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;

    // Skip if out of bounds
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    // Skip if this pixel is already assigned or is a boundary
    const idx = y * width + x;
    if (pixelToRegion[idx] !== 0) continue;

    // Add to region
    pixels.push({ x, y });
    pixelToRegion[idx] = regionId;

    // Add neighbors
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  return pixels;
}
