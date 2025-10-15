/**
 * Layer Generation System
 * Converts region map into drawable layers with clipping masks
 */

import type { RegionMap } from "./regionDetection";

export interface DrawingLayer {
  id: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  mask: ImageData;
}


/**
 * Generate layer metadata from a region map
 * Each layer represents one fillable region with a clipping mask
 */
export function generateLayers(regionMap: RegionMap): DrawingLayer[] {
  const layers: DrawingLayer[] = [];
  const { width, height, regionCount, pixelToRegion } = regionMap;

  // Create layer metadata for each region
  for (let regionId = 1; regionId <= regionCount; regionId++) {
    // Create mask ImageData for this region
    const mask = new ImageData(width, height);

    // Fill mask: white (255) for pixels in this region, transparent (0) for others
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelRegionId = pixelToRegion[y][x];
        const idx = (y * width + x) * 4;

        if (pixelRegionId === regionId) {
          // This pixel belongs to this region - make it opaque in the mask
          mask.data[idx] = 255;     // r
          mask.data[idx + 1] = 255; // g
          mask.data[idx + 2] = 255; // b
          mask.data[idx + 3] = 255; // a
        } else {
          // Not in this region - keep transparent
          mask.data[idx] = 0;
          mask.data[idx + 1] = 0;
          mask.data[idx + 2] = 0;
          mask.data[idx + 3] = 0;
        }
      }
    }

    // Create HTML canvas element for this layer
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });

    if (!ctx) {
      throw new Error(`Failed to get 2D context for layer ${regionId}`);
    }

    // Put the white mask pixels on the canvas ONCE during initialization
    // This allows us to use source-atop for clipping without temp canvases
    ctx.putImageData(mask, 0, 0);

    layers.push({
      id: regionId,
      canvas,
      ctx,
      mask,
    });
  }

  return layers;
}

/**
 * Draw a stroke on a layer with clipping applied
 * Uses source-atop to only draw where the mask pixels exist (no temp canvas needed!)
 */
export function drawStrokeWithClipping(
  layerCanvas: HTMLCanvasElement,
  layerCtx: CanvasRenderingContext2D,
  mask: ImageData,
  strokeCallback: (ctx: CanvasRenderingContext2D) => void
): void {
  // Save the current state
  layerCtx.save();

  // Use source-atop: only draws where existing pixels are opaque (where the mask is)
  layerCtx.globalCompositeOperation = "source-atop";

  // Draw the stroke - it will automatically clip to the mask pixels
  strokeCallback(layerCtx);

  // Restore the state
  layerCtx.restore();
}

/**
 * Find which layer (region) a point belongs to
 */
export function findLayerAtPoint(
  layers: DrawingLayer[],
  x: number,
  y: number
): DrawingLayer | null {
  // Round coordinates to pixel boundaries
  x = Math.round(x);
  y = Math.round(y);

  // Check each layer's mask to see if this point is in it
  for (const layer of layers) {
    const idx = (y * layer.mask.width + x) * 4;

    // Check if this pixel is opaque in the mask (meaning it's in this region)
    if (layer.mask.data[idx + 3] === 255) {
      return layer;
    }
  }

  return null;
}

/**
 * Composite all layers onto a display canvas
 */
export function compositeLayers(
  displayCtx: CanvasRenderingContext2D,
  layers: DrawingLayer[],
  width: number,
  height: number
): void {
  // Clear the display canvas
  displayCtx.clearRect(0, 0, width, height);

  // Draw each layer onto the display canvas
  for (const layer of layers) {
    displayCtx.drawImage(layer.canvas, 0, 0, width, height);
  }
}
