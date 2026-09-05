/**
 * Region Detection System
 * Identifies and maps distinct bounded regions in an image.
 *
 * This is the load-time hot path: it touches every pixel of a 1000x1000 image
 * several times, on the main thread, while the child stares at a spinner. It
 * is written with flat typed arrays and no per-pixel object allocation.
 */

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

const BOUNDARY = -1;
const UNASSIGNED = 0;

/**
 * Detect all regions in an image.
 * A region is a connected area of non-boundary pixels.
 */
export function detectRegions(
  imageData: ImageData,
  boundaryThreshold = 128,
  minRegionSize = 10,
  dilationRadius = 2
): RegionMap {
  const { width, height } = imageData;
  const pixelCount = width * height;

  const pixelToRegion = markBoundaries(imageData, boundaryThreshold);

  // Scratch buffers, allocated once and reused by every flood fill. Claiming
  // each pixel as it is pushed means a pixel is pushed at most once, so
  // neither buffer can exceed the pixel count.
  const stack = new Int32Array(pixelCount);
  const claimed = new Int32Array(pixelCount);

  let regionCount = 0;
  let nextRegionId = 1;

  for (let i = 0; i < pixelCount; i++) {
    if (pixelToRegion[i] !== UNASSIGNED) continue;

    const size = floodFillRegion(pixelToRegion, width, height, i, nextRegionId, stack, claimed);

    if (size >= minRegionSize) {
      regionCount++;
      nextRegionId++;
    } else {
      // Too small to color - fold it into the outline.
      for (let n = 0; n < size; n++) pixelToRegion[claimed[n]] = BOUNDARY;
    }
  }

  // Grow regions into the outline so colored strokes meet it (no white halo).
  if (dilationRadius > 0) {
    dilateRegions(pixelToRegion, width, height, dilationRadius);
  }

  return { width, height, regionCount, pixelToRegion };
}

/**
 * Mark every pixel darker than the threshold as an outline.
 *
 * Reads the RGBA bytes directly: a helper returning an `{r,g,b,a}` object here
 * would allocate one short-lived object per pixel (a million per image).
 */
function markBoundaries(imageData: ImageData, threshold: number): Int32Array {
  const { data, width, height } = imageData;
  const pixelToRegion = new Int32Array(width * height);
  // Compare the summed channels against 3x the threshold to avoid a divide.
  const sumThreshold = threshold * 3;

  for (let i = 0, p = 0; i < pixelToRegion.length; i++, p += 4) {
    if (data[p] + data[p + 1] + data[p + 2] < sumThreshold) {
      pixelToRegion[i] = BOUNDARY;
    }
  }

  return pixelToRegion;
}

/**
 * Flood fill from `startIndex`, claiming pixels into `regionId`.
 *
 * Pixels are claimed at push time rather than pop time, so each is pushed
 * exactly once - which both bounds the stack at the pixel count and removes
 * the need for a separate `visited` set. Returns the region's pixel count;
 * the claimed indices are left in `claimed[0..count)`.
 */
function floodFillRegion(
  pixelToRegion: Int32Array,
  width: number,
  height: number,
  startIndex: number,
  regionId: number,
  stack: Int32Array,
  claimed: Int32Array
): number {
  let top = 0;
  let count = 0;

  pixelToRegion[startIndex] = regionId;
  stack[top++] = startIndex;

  while (top > 0) {
    const i = stack[--top];
    claimed[count++] = i;

    const x = i % width;
    const y = (i / width) | 0;

    if (x > 0 && pixelToRegion[i - 1] === UNASSIGNED) {
      pixelToRegion[i - 1] = regionId;
      stack[top++] = i - 1;
    }
    if (x < width - 1 && pixelToRegion[i + 1] === UNASSIGNED) {
      pixelToRegion[i + 1] = regionId;
      stack[top++] = i + 1;
    }
    if (y > 0 && pixelToRegion[i - width] === UNASSIGNED) {
      pixelToRegion[i - width] = regionId;
      stack[top++] = i - width;
    }
    if (y < height - 1 && pixelToRegion[i + width] === UNASSIGNED) {
      pixelToRegion[i + width] = regionId;
      stack[top++] = i + width;
    }
  }

  return count;
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
    (x > 0 && pixelToRegion[i - 1] === BOUNDARY) ||
    (x < width - 1 && pixelToRegion[i + 1] === BOUNDARY) ||
    (y > 0 && pixelToRegion[i - width] === BOUNDARY) ||
    (y < height - 1 && pixelToRegion[i + width] === BOUNDARY)
  );
}

// Expand one pixel ring per round. A boundary pixel is claimed by the first
// frontier pixel to reach it, so regions never overlap.
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
    if (x > 0 && pixelToRegion[i - 1] === BOUNDARY) { pixelToRegion[i - 1] = region; next.push(i - 1); }
    if (x < width - 1 && pixelToRegion[i + 1] === BOUNDARY) { pixelToRegion[i + 1] = region; next.push(i + 1); }
    if (y > 0 && pixelToRegion[i - width] === BOUNDARY) { pixelToRegion[i - width] = region; next.push(i - width); }
    if (y < height - 1 && pixelToRegion[i + width] === BOUNDARY) { pixelToRegion[i + width] = region; next.push(i + width); }
  }
  return next;
}
