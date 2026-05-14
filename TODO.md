# TODO

## Future Improvements

### Architecture / Scaling (Critical — blocks real multi-region images on iPad)

The pipeline previously used one full-size (1000x1000) canvas **plus** a
retained full-size 4-channel `ImageData` mask per region. The first round of
fixes (below, ✅) sizes layers to their bounding box and caps undo history.
Remaining items are follow-ups.

- [x] **Per-region bounding-box sizing.** Layer canvas/mask are now sized to the
      region's bounding box with an `offsetX/offsetY`, not the full 1000x1000.
      Coordinates are translated to layer-local space before drawing.
      (`lib/layerGeneration.ts`, `components/Canvas.tsx`)
- [x] **Cap and shrink undo history.** `captureState()` now snapshots only the
      layers a stroke actually touched (just the active layer in region-locked
      mode), and the undo/redo stacks are capped at `MAX_HISTORY` (30).
      (`components/Canvas.tsx`, `lib/constants.ts`)
- [x] **`willReadFrequently: true`** on layer contexts — undo/redo reads them
      back via `getImageData` every stroke. (`lib/layerGeneration.ts`)
- [ ] **Drop the redundant per-layer `ImageData` mask.** Now bounding-box sized
      (much smaller), but still duplicates what `lookupTable` encodes. Could
      make the lookup table the single source of truth, or store the mask as a
      1-bit/1-byte bitmask. Lower priority now. (`lib/layerGeneration.ts`)
- [x] **Switch `pixelToRegion` to a flat `Int32Array`.** Was `number[][]`
      (boxed) — now a flat typed array: cheaper to allocate, faster to scan, and
      transferable to a Web Worker with no structured clone. The redundant
      `visited` Set in `floodFillRegion` was also dropped. (`lib/regionDetection.ts`)
- [ ] **Move region detection to a Web Worker.** `detectRegions` still runs
      synchronously on the main thread (~1M pixel flood fill), janking the
      LoadingScreen; `generateLayers` + `createLayerLookupTable` add more.
      The worker can't run `generateLayers` (needs `document.createElement`),
      so the split is: flood fill in the worker, layer/canvas creation stays on
      the main thread.
      **Recommendation: lower priority.** The `Int32Array` pass already
      captured the cheap win. Only build this if profiling on the actual iPad
      still shows a visible freeze — the benefit is load-time polish, not a
      crash fix, and it adds a worker file + async plumbing.
- [ ] **Reconsider N stacked DOM canvases.** Still N absolutely-positioned
      canvases, but each is now bounding-box sized rather than full 1000x1000,
      so the compositor footprint is far smaller. Could still composite onto a
      single drawing canvas if compositor cost shows up in profiling.

### Drawing Correctness

- [ ] **Fix the white halo around outlines.** Boundary pixels (brightness < 128)
      belong to no region, so colored strokes stop short of the black lines.
      Fix by dilating regions a few pixels into the boundary during detection
      (a `getRegionAtWithTolerance`-style helper used to exist for this but was
      never wired in and has since been removed). (`lib/regionDetection.ts`)
- [x] **Fixed the double-fire guard.** Replaced the global 50ms wall-clock
      guard (which dropped legitimate rapid taps and didn't cover moves at all)
      with per-gesture input-source ownership: whichever of Pointer/Touch fires
      first claims the gesture via `activeInputSourceRef`, and the other source
      is ignored until it ends. Thin wrappers on the DOM bindings enforce this;
      a window-level gesture-end listener clears the claim even when the
      pointer is released off-canvas. (`components/Canvas.tsx`)
- [ ] Soft brush blur is hard-clipped at region edges by the 0/255 mask alpha;
      threshold-128 against anti-aliased outlines also gives ragged edges.
- [ ] No palm rejection — `event.touches[0]` lets a resting palm hijack drawing.
- [ ] `OutlineOverlay` assumes exactly 1000x1000 (`drawImage(img, 0, 0)`) while
      `Canvas.save()` scales the outline — inconsistent for non-1000px assets.

### Code Cleanup (Low Risk)

- [x] Removed dead code: `scanlineFill`, `floodFill` (+ orphaned
      `setPixelColor`/`colorsMatch`), `hexToRgb`/`rgbToHex`, `isInBounds`,
      `hasMovedRef`, and its now-dead `SIGNIFICANT_MOVEMENT_THRESHOLD` jitter
      block. `lib/floodFill.ts` was left holding only `RGB`/`Point`/
      `getPixelColor`, so it was renamed to `lib/pixels.ts`.
      (`getRegionAt`/`getRegionAtWithTolerance` were removed earlier in the
      `Int32Array` pass.)
- [x] Removed the redundant `visited` Set in `floodFillRegion` — `pixelToRegion`
      already tracks visited state. (`lib/regionDetection.ts`)
- [x] De-duplicated `BRUSH_SIZES` — `lib/constants.ts` is now the single source
      of truth; `components/BrushSettings.tsx` imports it.
- [ ] Replace the brittle synthetic-event casts in the touch handlers
      (`{...} as React.PointerEvent`) with a proper shared input type.

### Performance Optimizations

#### Image Format Optimization (Optional)

- [ ] Convert PNG images to 1-bit monochrome format to reduce file sizes by ~70%
  - **Current:** 8-bit RGBA PNG (24-94 KB per image, ~730KB total)
  - **Target:** 1-bit monochrome PNG (estimated 5-15 KB per image, ~200KB total)
  - **Command:** `convert input.png -monochrome output.png` (requires ImageMagick)
  - **Benefits:**
    - Faster image loading on slower connections
    - Reduced bandwidth usage
    - No code changes required
    - Same perfect quality for black/white line art
  - **Note:** Only do this if file size becomes a concern. Current sizes are acceptable.

### Code Quality Improvements (Medium Priority)

- [ ] Extract duplicate button rendering code in DrawingScreen.tsx
- [ ] Add type-safe button state management
- [ ] Consider memoizing expensive calculations

### Accessibility & Polish (Low Priority)

- [ ] Add accessibility labels to icon-only buttons (aria-label)
- [ ] Document memory cleanup patterns in Canvas.tsx
- [ ] Consider extracting magic color values (#FFFFFF for eraser)

## Completed Issues

### ✅ Edge Gap Issue When Drawing Quickly (RESOLVED)

**Problem:**
When the user moves the mouse/pointer very quickly and enters/exits the canvas, there were small gaps between the canvas edge and where the drawing starts/ends.

**Solution Implemented:**
Global pointer tracking approach - track pointer position across the entire page, then use that information to draw from outside the canvas to the entry point, and from the last point to the exit point.

**Implementation Details:**

- Added `lastGlobalPositionRef` with window-level `pointermove` listener
- Modified `handlePointerEnter` to draw from global position to entry point
- Created `handlePointerLeave` to draw final stroke to exit coordinates
- Works for both stay-within-lines and free drawing modes

**Resolved in commit:** `1f8f0ba` - Fix edge gaps with global pointer tracking
