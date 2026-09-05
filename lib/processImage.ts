import { detectRegions, type RegionMap } from "@/lib/regionDetection"
import { loadImage, extractImageData } from "@/lib/imageLoader"
import {
  BOUNDARY_THRESHOLD,
  MIN_REGION_SIZE,
  REGION_DILATION_RADIUS,
} from "@/lib/constants"

export interface ProcessedImageData {
  regionMap: RegionMap
  outlineImage: HTMLImageElement
}

/**
 * Process an image for the drawing canvas
 * - Detects fillable regions
 * - Returns the outline image for the overlay
 *
 * The image is loaded and decoded once and used for both, rather than being
 * fetched twice under two different Image elements.
 */
export async function processImage(
  imageSrc: string | { src: string }
): Promise<ProcessedImageData> {
  const imgUrl = typeof imageSrc === "string" ? imageSrc : imageSrc.src

  const outlineImage = await loadImage(imgUrl)
  const imageData = extractImageData(outlineImage)
  const regionMap = detectRegions(
    imageData,
    BOUNDARY_THRESHOLD,
    MIN_REGION_SIZE,
    REGION_DILATION_RADIUS
  )

  return { regionMap, outlineImage }
}
