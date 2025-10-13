import { detectRegions, type RegionMap } from "@/lib/regionDetection"
import { loadImageData } from "@/lib/imageLoader"

export interface ProcessedImageData {
  regionMap: RegionMap
  outlineImage: HTMLImageElement
}

/**
 * Process an image for the drawing canvas
 * - Detects fillable regions
 * - Loads the outline image
 */
export async function processImage(
  imageSrc: string | { src: string }
): Promise<ProcessedImageData> {
  const imgUrl = typeof imageSrc === "string" ? imageSrc : imageSrc.src

  // Load and process image data for region detection
  const imageData = await loadImageData(imgUrl)
  const regionMap = detectRegions(imageData, 128, 100)
  console.log(`Detected ${regionMap.regions.length} regions`)

  // Load outline image
  const outlineImage = await loadOutlineImage(imgUrl)

  return { regionMap, outlineImage }
}

/**
 * Load the outline image
 */
function loadOutlineImage(imgUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load outline image"))
    img.src = imgUrl
  })
}
