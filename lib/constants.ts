/**
 * Application-wide constants
 */

// Canvas and image dimensions
export const CANVAS_SIZE = 1000

// Region detection parameters
export const BOUNDARY_THRESHOLD = 128
export const MIN_REGION_SIZE = 100

// Drawing behavior
export const SIGNIFICANT_MOVEMENT_THRESHOLD = 2

// Layer lookup table sentinel value
export const NO_LAYER_SENTINEL = 65535

// Performance monitoring
export const FPS_LOG_INTERVAL_MS = 1000

// Alpha channel values
export const OPAQUE_ALPHA = 255
export const TRANSPARENT_ALPHA = 0

// Brush sizes in pixels
export const BRUSH_SIZES = {
  small: 10,
  medium: 25,
  large: 50,
} as const

// Shared UI styling
export const APP_BACKGROUND_GRADIENT =
  "bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-950 dark:via-purple-950 dark:to-blue-950"
