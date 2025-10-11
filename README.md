# Emily Draw

A digital coloring book application with "stay within the lines" functionality, built with Next.js and HTML Canvas.

## Features

- **Region-locked drawing**: Click in a region to start coloring, and your brush automatically stays within that bounded area
- **Smart boundary detection**: Draws right up to the edges without crossing into other regions
- **Performance optimized**: Fast path for normal drawing, segmented rendering for boundary crossings
- **Two-layer canvas architecture**: Drawing layer underneath, outline layer on top for always-visible lines

## Technical Implementation

### Canvas Architecture

The application uses a two-layer canvas system:

1. **Drawing Canvas (bottom)**: Captures user's coloring with a transparent background
2. **Outline Canvas (top)**: Displays the image outline with `pointer-events: none` to allow mouse events to pass through

Both canvases are absolutely positioned and precisely sized to ensure pixel-perfect alignment.

### Region Detection

**Image Loading** (`lib/imageLoader.ts`):
- Loads the PNG image with a white background fill (handles transparency)
- Extracts raw pixel data using an offscreen canvas
- Returns `ImageData` for region analysis

**Region Mapping** (`lib/regionDetection.ts`):
- Scans all pixels to identify boundaries (dark pixels with brightness < 128)
- Creates a 2D lookup map: `pixelToRegion[y][x]`
  - `-1` = boundary pixel (black line)
  - `0` = unassigned/empty space
  - `>0` = region ID
- Uses flood fill algorithm to identify connected non-boundary areas
- Filters out small regions (< 100 pixels) as noise
- Each region stores: ID, pixel coordinates, bounding box, area, and average color

**Boundary Tolerance** (`getRegionAtWithTolerance`):
- When checking if a pixel belongs to a region, also checks nearby pixels (within tolerance radius)
- If a boundary pixel has the target region nearby, treats it as part of that region
- Allows drawing slightly onto thick boundary lines without color showing on the other side
- Default tolerance: 4 pixels

### Drawing Algorithm

**Region Locking** (`handleMouseDown`):
- Detects which region was clicked
- Locks drawing to that region ID for the entire stroke
- Rejects clicks on boundaries or empty space

**Smart Stroke Rendering** (`handleMouseMove`):

The drawing system uses an adaptive dual-path approach:

**Fast Path** (movements < 10 pixels):
- Single region check at the endpoint
- Direct line drawing with `ctx.stroke()`
- Minimal computational overhead
- Handles ~90% of normal drawing strokes

**Segmented Path** (movements ≥ 10 pixels):
- Interpolates points along the stroke path (every ~8 pixels)
- Checks each interpolated point against the locked region (with 4px tolerance)
- Identifies continuous valid segments within the region
- Draws only the valid segments, automatically stopping at boundaries
- If the stroke crosses back into the region, starts a new segment from the re-entry point

**Drawing Style**:
- Line width: 20px
- Line cap: round
- Line join: round
- Color: Configurable (currently green for testing)

### Performance Optimizations

1. **Fast path for small movements**: Skips interpolation when movement is < 10px
2. **Coarse sampling for long strokes**: Samples every 8 pixels instead of every pixel
3. **Boundary tolerance**: Reduces false boundary triggers near edges
4. **Early returns**: Exits quickly when not drawing or outside locked region
5. **Integer coordinate rounding**: Ensures valid array access in region map

### File Structure

```
lib/
  ├── regionDetection.ts    # Region identification and lookup
  ├── imageLoader.ts         # Image data extraction
  ├── canvasUtils.ts         # Coordinate conversion, color utilities
  └── floodFill.ts          # Flood fill algorithm (for region detection)

components/
  ├── Canvas.tsx            # Main drawing component
  └── DebugOverlay.tsx      # Region statistics display

app/
  └── page.tsx              # Home page
```

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Next.js 15.5.4** with App Router and Turbopack
- **React 19.1.0**
- **TypeScript** (strict mode)
- **Tailwind CSS v4** with OKLCH color space
- **HTML Canvas API** for drawing and pixel manipulation

## Future Enhancements

- Color picker UI
- Multiple brush sizes
- Undo/redo functionality
- Clear/reset button
- Save/export artwork
- Multiple images to color
