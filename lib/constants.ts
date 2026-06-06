/**
 * Application-wide constants
 */

// Region detection parameters
export const BOUNDARY_THRESHOLD = 128
export const MIN_REGION_SIZE = 10
// Pixels each region grows into the surrounding outline, so colored strokes
// meet the outline instead of leaving a thin white halo under its edge.
export const REGION_DILATION_RADIUS = 2

// Layer lookup table sentinel value
export const NO_LAYER_SENTINEL = 65535

// Performance monitoring
export const FPS_LOG_INTERVAL_MS = 1000

// Maximum number of undo/redo snapshots retained (caps history memory)
export const MAX_HISTORY = 30

// Alpha channel values
export const OPAQUE_ALPHA = 255

// Brush sizes in pixels
export const BRUSH_SIZES = {
  small: 10,
  medium: 50,
  large: 100,
} as const

// Shared UI styling
export const APP_BACKGROUND_GRADIENT =
  "bg-gradient-to-br from-brand-accent-subtle via-brand-subtle to-primary-subtle"
