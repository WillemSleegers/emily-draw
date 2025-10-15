/**
 * Layer Generation System
 * Converts region map into drawable layers with clipping masks
 */

import type { RegionMap } from "./regionDetection";

export interface DrawingLayer {
  id: number;
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  mask: ImageData;
}

/**
 * Generate drawable layers from a region map
 * Each layer represents one fillable region with a clipping mask
 */
export function generateLayers(regionMap: RegionMap): DrawingLayer[] {
  const layers: DrawingLayer[] = [];
  const { width, height, regionCount, pixelToRegion } = regionMap;

  // Create a layer for each region
  for (let regionId = 1; regionId <= regionCount; regionId++) {
    // Create offscreen canvas for this layer
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error(`Failed to get context for region ${regionId}`);
      continue;
    }

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
 * Uses a temporary canvas to apply the mask without affecting previous content
 */
export function drawStrokeWithClipping(
  layerCanvas: OffscreenCanvas,
  layerCtx: OffscreenCanvasRenderingContext2D,
  mask: ImageData,
  strokeCallback: (ctx: OffscreenCanvasRenderingContext2D) => void
): void {
  const width = layerCanvas.width;
  const height = layerCanvas.height;

  // Create temporary canvas for this stroke
  const tempCanvas = new OffscreenCanvas(width, height);
  const tempCtx = tempCanvas.getContext("2d");

  if (!tempCtx) return;

  // Draw the stroke on the temporary canvas
  strokeCallback(tempCtx);

  // Create a separate canvas for the mask
  const maskCanvas = new OffscreenCanvas(width, height);
  const maskCtx = maskCanvas.getContext("2d");

  if (!maskCtx) return;

  // Put the mask on the mask canvas
  maskCtx.putImageData(mask, 0, 0);

  // Apply the mask to the stroke (keep only parts within the region)
  tempCtx.globalCompositeOperation = "destination-in";
  tempCtx.drawImage(maskCanvas, 0, 0);

  // Composite the masked stroke onto the layer canvas
  layerCtx.globalCompositeOperation = "source-over";
  layerCtx.drawImage(tempCanvas, 0, 0);
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
