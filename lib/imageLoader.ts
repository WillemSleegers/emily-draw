/**
 * Image Loading Utilities
 * Load images and extract pixel data without canvas rendering
 */

/** Load an image element, resolving once it has decoded. */
export function loadImage(imagePath: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`))
    img.src = imagePath
  })
}

/**
 * Extract the pixel data of an already-loaded image.
 *
 * Uses a temporary canvas rather than relying on rendering timing.
 */
export function extractImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas")
  // SVGs without explicit dimensions may report 0.
  canvas.width = img.naturalWidth || img.width || 1000
  canvas.height = img.naturalHeight || img.height || 1000

  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("Could not get canvas context")

  // Fill with white first, so transparent artwork reads as colorable space.
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
