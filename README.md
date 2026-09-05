# Emily Draw

A digital coloring book application designed for young children (around 3 years old) with intelligent "stay within the lines" functionality, built with Next.js and HTML Canvas.

## Key Features

- **Layer-based drawing architecture**: Each colorable region is its own `<canvas>`, sized to that region's bounding box, with native clipping
- **Stay-within-lines toggle**: Switch between region-locked drawing and free drawing modes
- **Edge gap elimination**: Global pointer tracking ensures strokes reach canvas edges with no gaps
- **Apple Pencil optimized**: Touch event fallback ensures reliable quick taps and strokes on iPad
- **Child-friendly UI**: Large square buttons with visual-only indicators (no text labels)
- **Touch-optimized**: Designed for iPad and touchscreen devices with proper touch-action handling
- **Multiple brush controls**: Three sizes (small, medium, large) and two types (solid, soft blur effect)
- **Simple color picker**: Easy color selection interface with visual feedback
- **Undo/Redo**: Full drawing history with undo and redo support
- **Save/Export**: Download completed artwork as PNG images
- **Eraser tool**: White eraser for corrections

## Technical Implementation

### Innovations

#### 1. **Layer-Based Architecture** (`lib/layerGeneration.ts`)

Instead of checking region boundaries on every pointer move, we pre-generate separate drawable layers:

- **Region Detection**: Scan image to identify bounded regions (flood fill algorithm)
- **Layer Generation**: Create one canvas per region, cropped to its bounding box, pre-painted with an opaque mask
- **Native Clipping**: Draw with `source-atop`, which only paints where the mask is already opaque - the browser enforces the boundary
- **Compositing**: The layers are the visible canvases; the browser composites them

**Benefits:**
- ✅ Eliminated ~100 lines of complex path interpolation code
- ✅ No region checking during drawing (performance win)
- ✅ Pixel-perfect boundaries via native canvas clipping
- ✅ Easy to add per-region features (undo, clear, opacity)

#### 2. **Edge Gap Elimination** (`components/Canvas.tsx`)

**Problem**: When pointer moves quickly, browser events fire at discrete intervals. By the time `pointerenter` detects entry, pointer may already be pixels inside canvas - creating gaps.

**Solution**: Global pointer tracking
- Track pointer position across entire page (window-level listener)
- Only track when pointer is over canvas to avoid capturing UI interactions
- On canvas entry: draw from last global position → entry point
- On canvas exit: draw from last point → exit coordinates
- Preserve active layer when leaving/re-entering to maintain region consistency
- Line naturally crosses canvas edge with no gaps

**Result**: Smooth, continuous strokes even with fast mouse movements

#### 3. **Apple Pencil Optimization** (`components/Canvas.tsx`)

**Problem**: Safari on iPad filters out quick Apple Pencil taps from the Pointer Events API, causing intermittent failures where quick taps/strokes don't register.

**Solution**: Touch event fallback system
- Add parallel touch event listeners alongside pointer events
- Normalise both sources to one internal `DrawInput` shape
- **Input-source arbitration** instead of debouncing: whichever source fires
  first owns the gesture, and only that source can extend or end it
- Expand pointer moves with `getCoalescedEvents()`, so a fast Pencil stroke
  follows every sample instead of 60 Hz straight chords
- Use `requestAnimationFrame` for non-blocking initial dot rendering

**Result**: Reliable drawing with both finger touches and Apple Pencil, even during very quick taps and short strokes

#### 4. **Stay-Within-Lines Toggle**

Two drawing modes with simple visual toggle:
- **Region-locked mode** (Shapes icon): Layer-based drawing with clipping
- **Free drawing mode** (Pencil icon): Draw anywhere on canvas

Allows children to color precisely within lines or experiment freely.

### Canvas Architecture

Two visual tiers, both inside one square container:

1. **Drawing layers**: one `<canvas>` per region, absolutely positioned at its
   bounding box as a percentage of the container, `pointer-events: none`.
   These are the visible pixels - there is no separate display canvas.
2. **Outline overlay** (top): the line art, drawn with `mix-blend-multiply` so
   white in the source doesn't paint over the artwork beneath it.

Pointer events land on the container, not on any canvas, so hit-testing is a
single lookup rather than a walk over N stacked elements.

### Region Detection (`lib/regionDetection.ts`)

- Identifies boundaries: dark pixels (brightness < 128)
- Builds a flat `Int32Array` map, `pixelToRegion[y * width + x]`
  (-1 = boundary, 0 = unassigned, >0 = region ID)
- Flood-fills connected non-boundary areas, claiming each pixel as it is pushed
  so the stack is bounded and no `visited` set is needed
- Filters noise: regions below `MIN_REGION_SIZE` are folded back into the outline
- Dilates each region a few pixels into the outline, so strokes meet the lines
  with no white halo
- No per-pixel object allocation anywhere in the pass

### Drawing System

**Stay-Within-Lines Mode:**
1. Pointer-down resolves the region via the O(1) `Uint16Array` lookup table
2. That layer is held for the whole stroke, even across leaving and re-entering
   the canvas, so the stroke can't jump regions
3. Strokes draw straight onto the layer with `source-atop`, which clips them to
   the region's mask - no temp canvas, no manual compositing

**Free Drawing Mode:**
- No region lock; each segment paints onto every layer whose bounding box it
  crosses, after a cheap bounding-box reject

### Undo/Redo

Snapshots are per layer and taken lazily: the first time a stroke paints into a
layer, that layer's previous pixels are recorded. The whole stroke commits as
one history entry when the gesture ends - including when the pointer is
released outside the canvas, which the element's own handlers never see.

Snapshotting every layer up front would cost roughly 18 MB per entry on a
300-region picture in free-draw mode.

### File Structure

```
lib/
  ├── layerGeneration.ts     # Generate drawable layers from regions
  ├── regionDetection.ts     # Region identification and mapping
  ├── imageLoader.ts         # Image loading and pixel extraction
  ├── processImage.ts        # Image processing pipeline
  ├── saveDrawing.ts         # Export artwork (Web Share on iPad, download elsewhere)
  ├── canvasUtils.ts         # Coordinate conversion
  └── constants.ts           # Thresholds, brush sizes, shared styling

components/
  ├── Canvas.tsx             # Main drawing canvas with layer system
  ├── DrawingScreen.tsx      # Main drawing interface layout
  ├── ImageGallery.tsx       # Picture chooser, grouped by set
  ├── OutlineOverlay.tsx     # Outline image overlay
  ├── ColorPicker.tsx        # Color selection component
  ├── BrushSettings.tsx      # Brush size/type/mode controls
  ├── LoadingScreen.tsx      # Wordless loading state
  ├── ErrorScreen.tsx        # Wordless failure state
  ├── ErrorBoundary.tsx      # Catches render errors, shows ErrorScreen
  └── ui/                    # shadcn/ui components

app/
  ├── layout.tsx             # Root layout with Geist font
  ├── page.tsx               # Home page with image selection
  └── globals.css            # Global styles with Tailwind v4
```

## Getting Started

This project uses **pnpm**.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

To draw on the iPad, add its address to `allowedDevOrigins` in `next.config.ts`
and open the dev server over the LAN.

## Tech Stack

- **Next.js 16** with App Router and Turbopack
- **React 19.2**
- **TypeScript** (strict mode)
- **Tailwind CSS v4** with OKLCH color space
- **HTML Canvas API** for drawing and pixel manipulation

## Device Compatibility

This app is optimized for:
- **iPad with Apple Pencil** (primary target device)
- iPad with finger touch
- Desktop browsers with mouse
- Other touchscreen tablets

## Future Enhancements

- ✅ ~~Color picker UI~~ (Completed)
- ✅ ~~Multiple brush sizes~~ (Completed)
- ✅ ~~Stay-within-lines toggle~~ (Completed)
- ✅ ~~Undo/Redo functionality~~ (Completed)
- ✅ ~~Save/export artwork~~ (Completed)
- ✅ ~~Eraser tool~~ (Completed)
- ✅ ~~Apple Pencil optimization~~ (Completed)
- Per-region undo/redo functionality
- Clear individual regions
- Region opacity controls
- More coloring book images
- Animations and sound effects for children
