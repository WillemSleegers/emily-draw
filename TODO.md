# TODO

## Known Issues

### Edge Gap Issue When Drawing Quickly

**Problem:**
When the user moves the mouse/pointer very quickly and enters the canvas from outside, there can be small gaps between the canvas edge and where the drawing starts.

**Root Cause:**
- Browser pointer events (`pointerenter`) fire at discrete sampling intervals
- When the pointer is moving quickly, by the time `pointerenter` fires, the pointer may already be several pixels inside the canvas boundary
- We treat this sampled position as the "entry point" and start drawing from there
- This creates a gap between the actual canvas edge and our first drawn pixel

**Impact:**
- More noticeable with fast mouse movements
- Creates visual discontinuity when drawing strokes that should go all the way to the edge
- Affects user experience, especially for children who may move the pointer quickly

**Potential Solutions:**

1. **Extrapolate backwards to canvas edge (most accurate)**
   - On the first `handlePointerMove` after `pointerenter`, we have two points
   - Calculate the line/vector between entry sample and current position
   - Extrapolate backwards to find where this line intersects the canvas boundary
   - Draw from that calculated edge point instead of the sampled entry point

2. **Draw initial dot at entry point (simpler)**
   - When `pointerenter` fires, immediately draw a filled circle at that position
   - Radius = brushSize/2
   - Helps fill the visual gap even if not at true edge

3. **Increase line cap coverage**
   - Use larger/rounder lineCap settings
   - May help but won't fully solve the issue for fast movements

**Recommended Approach:**
Option 1 (extrapolation) for accuracy, with fallback to Option 2 if edge intersection calculation becomes too complex.

**Files Affected:**
- `components/Canvas.tsx` - `handlePointerEnter` and `handlePointerMove` functions
