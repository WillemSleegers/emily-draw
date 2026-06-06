/**
 * Layer Generation System
 * Converts a region map into drawable layers with clipping masks.
 *
 * Each layer is sized to its region's bounding box (not the full image), so
 * memory scales with the area actually covered by regions rather than
 * regionCount x fullImageArea. A 1000x1000 image with 40 regions used to need
 * ~320 MB of layer backing store; bounding-box layers bring that down roughly
 * to the image area itself.
 */

import type { RegionMap } from "./regionDetection";
import { NO_LAYER_SENTINEL, OPAQUE_ALPHA } from "./constants";

export interface DrawingLayer {
  id: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Clipping mask, sized to the bounding box (not the full image). */
  mask: ImageData;
  /** Bounding-box origin in full-image coordinates. */
  offsetX: number;
  offsetY: number;
  /** Bounding-box dimensions (also the canvas/mask dimensions). */
  width: number;
  height: number;
}

export interface LayerLookupTable {
  width: number;
  height: number;
  data: Uint16Array; // Maps linear pixel index to layer index (0-based, 65535 = no layer)
}

/**
 * Generate layer metadata from a region map.
 * Each layer represents one fillable region, with a canvas + clipping mask
 * cropped to that region's bounding box.
 */
export function generateLayers(regionMap: RegionMap): DrawingLayer[] {
  const { width, height, regionCount, pixelToRegion } = regionMap;
  const { minX, minY, maxX, maxY } = computeRegionBounds(pixelToRegion, width, height, regionCount);

  const layers: DrawingLayer[] = [];
  for (let regionId = 1; regionId <= regionCount; regionId++) {
    if (maxX[regionId] < 0) continue; // region had no pixels (defensive)

    const offsetX = minX[regionId];
    const offsetY = minY[regionId];
    const w = maxX[regionId] - offsetX + 1;
    const h = maxY[regionId] - offsetY + 1;

    const mask = buildRegionMask(pixelToRegion, regionId, offsetX, offsetY, w, h, width);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    // willReadFrequently: undo/redo reads this canvas back via getImageData.
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) throw new Error(`Failed to get 2D context for layer ${regionId}`);

    // Paint the white mask pixels once so source-atop clipping works without a
    // temp canvas (see drawStrokeWithClipping).
    ctx.putImageData(mask, 0, 0);

    layers.push({ id: regionId, canvas, ctx, mask, offsetX, offsetY, width: w, height: h });
  }

  return layers;
}

function computeRegionBounds(
  pixelToRegion: Int32Array,
  width: number,
  height: number,
  regionCount: number
) {
  const minX = new Int32Array(regionCount + 1).fill(width);
  const minY = new Int32Array(regionCount + 1).fill(height);
  const maxX = new Int32Array(regionCount + 1).fill(-1);
  const maxY = new Int32Array(regionCount + 1).fill(-1);

  for (let y = 0; y < height; y++) {
    const rowBase = y * width;
    for (let x = 0; x < width; x++) {
      const id = pixelToRegion[rowBase + x];
      if (id <= 0) continue; // boundary (-1) or unassigned (0)
      if (x < minX[id]) minX[id] = x;
      if (x > maxX[id]) maxX[id] = x;
      if (y < minY[id]) minY[id] = y;
      if (y > maxY[id]) maxY[id] = y;
    }
  }

  return { minX, minY, maxX, maxY };
}

// Mask: opaque where the pixel belongs to this region, transparent elsewhere.
// ImageData is zero-initialised, so only opaque pixels need writing.
function buildRegionMask(
  pixelToRegion: Int32Array,
  regionId: number,
  offsetX: number,
  offsetY: number,
  w: number,
  h: number,
  imageWidth: number
): ImageData {
  const mask = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    const rowBase = (offsetY + y) * imageWidth;
    for (let x = 0; x < w; x++) {
      if (pixelToRegion[rowBase + offsetX + x] === regionId) {
        const idx = (y * w + x) * 4;
        mask.data[idx] = OPAQUE_ALPHA;
        mask.data[idx + 1] = OPAQUE_ALPHA;
        mask.data[idx + 2] = OPAQUE_ALPHA;
        mask.data[idx + 3] = OPAQUE_ALPHA;
      }
    }
  }
  return mask;
}

/**
 * Draw a stroke on a layer, clipped to the layer's region.
 *
 * source-atop only paints where opaque pixels already exist (the mask pixels
 * painted in generateLayers), so no temp canvas is needed.
 *
 * The strokeCallback must draw in layer-local coordinates, i.e. full-image
 * coordinates minus the layer's offsetX/offsetY.
 */
export function drawStrokeWithClipping(
  layerCtx: CanvasRenderingContext2D,
  strokeCallback: (ctx: CanvasRenderingContext2D) => void
): void {
  layerCtx.save();

  // Use source-atop: only draws where existing pixels are opaque (the mask).
  layerCtx.globalCompositeOperation = "source-atop";

  strokeCallback(layerCtx);

  layerCtx.restore();
}

/**
 * Create an O(1) lookup table mapping every full-image pixel to its layer index.
 * This is much faster than iterating through all layers on every pointer move.
 */
export function createLayerLookupTable(
  layers: DrawingLayer[],
  width: number,
  height: number
): LayerLookupTable {
  // Use Uint16Array to support up to 65,535 layers (more than enough)
  const data = new Uint16Array(width * height);
  data.fill(NO_LAYER_SENTINEL);

  // Populate the table from each layer's bounding-box mask.
  layers.forEach((layer, layerIndex) => {
    const { offsetX, offsetY, width: w, height: h, mask } = layer;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // If this pixel is opaque in the mask, it belongs to this layer.
        if (mask.data[(y * w + x) * 4 + 3] === OPAQUE_ALPHA) {
          data[(offsetY + y) * width + (offsetX + x)] = layerIndex;
        }
      }
    }
  });

  return { width, height, data };
}

/**
 * Find which layer (region) a point belongs to using the O(1) lookup table.
 */
export function findLayerAtPoint(
  layers: DrawingLayer[],
  x: number,
  y: number,
  lookupTable: LayerLookupTable
): DrawingLayer | null {
  // Round coordinates to pixel boundaries
  x = Math.round(x);
  y = Math.round(y);

  // Bounds check
  if (x < 0 || x >= lookupTable.width || y < 0 || y >= lookupTable.height) {
    return null;
  }

  const layerIndex = lookupTable.data[y * lookupTable.width + x];

  // NO_LAYER_SENTINEL means no layer at this position
  if (layerIndex === NO_LAYER_SENTINEL) {
    return null;
  }

  return layers[layerIndex] || null;
}
