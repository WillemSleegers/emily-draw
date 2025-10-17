# TODO

## Future Improvements

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
