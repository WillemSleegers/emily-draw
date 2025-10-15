# TODO

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
