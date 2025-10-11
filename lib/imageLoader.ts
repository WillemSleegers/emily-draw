/**
 * Image Loading Utilities
 * Load images and extract pixel data without canvas rendering
 */

/**
 * Load an image and extract its ImageData
 * This creates a temporary canvas to get pixel data but doesn't rely on rendering timing
 */
export async function loadImageData(imagePath: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Create an offscreen canvas for pixel extraction
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Set canvas size to image size
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      // Fill with white background first (for transparent PNGs)
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw image on top of white background
      ctx.drawImage(img, 0, 0);

      // Extract pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      resolve(imageData);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };

    // Start loading
    img.src = imagePath;
  });
}

/**
 * Get image dimensions without loading full pixel data
 */
export async function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };

    img.src = imagePath;
  });
}
