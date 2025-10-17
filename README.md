# Emily Draw

A digital coloring book application designed for young children (around 3 years old) with intelligent "stay within the lines" functionality, built with Next.js and HTML Canvas.

## Key Features

- **Layer-based drawing architecture**: Each colorable region is a separate OffscreenCanvas with native clipping
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
- **Layer Generation**: Create one OffscreenCanvas per region with a clipping mask
- **Native Clipping**: Draw freely on each layer - browser handles boundary enforcement
- **Compositing**: Merge all layers onto display canvas

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
- Convert touch events to synthetic pointer events
- Debounce within 50ms to prevent double-firing
- Use `requestAnimationFrame` for non-blocking initial dot rendering
- Optimize state capture to reduce event handler blocking

**Result**: Reliable drawing with both finger touches and Apple Pencil, even during very quick taps and short strokes

#### 4. **Stay-Within-Lines Toggle**

Two drawing modes with simple visual toggle:
- **Region-locked mode** (Shapes icon): Layer-based drawing with clipping
- **Free drawing mode** (Pencil icon): Draw anywhere on canvas

Allows children to color precisely within lines or experiment freely.

### Canvas Architecture

Three-layer visual system:

1. **Drawing Layers** (OffscreenCanvas array): One per region, composited to display canvas
2. **Display Canvas** (visible): Shows merged result of all drawing layers
3. **Outline Overlay** (top): Displays outline image with `pointer-events: none`

All layers precisely sized and absolutely positioned for pixel-perfect alignment.

### Region Detection (`lib/regionDetection.ts`)

- Identifies boundaries: dark pixels (brightness < 128)
- Creates 2D map: `pixelToRegion[y][x]` (-1=boundary, 0=empty, >0=region ID)
- Uses flood fill to find connected non-boundary areas
- Filters noise: removes regions < 10 pixels
- Generates clipping masks for each valid region

### Drawing System

**Stay-Within-Lines Mode:**
1. Click detects which layer (region) via mask lookup
2. Draw strokes on temporary canvas
3. Apply region mask via `destination-in` compositing
4. Merge masked stroke onto layer
5. Composite all layers to display

**Free Drawing Mode:**
- Direct drawing on display canvas
- No region restrictions or clipping

### File Structure

```
lib/
  ├── layerGeneration.ts     # Generate drawable layers from regions
  ├── regionDetection.ts     # Region identification and mapping
  ├── imageLoader.ts         # Image data extraction
  ├── processImage.ts        # Image processing pipeline
  ├── canvasUtils.ts         # Coordinate conversion, utilities
  └── floodFill.ts          # Flood fill algorithm

components/
  ├── Canvas.tsx             # Main drawing canvas with layer system
  ├── DrawingScreen.tsx      # Main drawing interface layout
  ├── OutlineOverlay.tsx     # Outline image overlay
  ├── ColorPicker.tsx        # Color selection component
  ├── BrushSettings.tsx      # Brush size/type/mode controls
  └── ui/                    # shadcn/ui components

app/
  ├── layout.tsx             # Root layout with Geist font
  ├── page.tsx               # Home page with image selection
  └── globals.css            # Global styles with Tailwind v4
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
