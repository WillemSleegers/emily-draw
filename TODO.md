# TODO

## Measured baseline (2026-09-05)

Desktop Chromium, dev build, taken with a scripted stroke:

| Picture       | Layers | Tap → canvas ready | Stroke FPS |
| ------------- | -----: | -----------------: | ---------: |
| Circle        |      2 |              157ms |        121 |
| Acorn Shop    |    130 |              145ms |        122 |
| Reading Nook  |    326 |              164ms |        118 |

Layer memory for a 326-region picture is ~18 MB (canvas backing stores plus the
retained masks), not the ~320 MB the pre-bounding-box design would have needed.

**These numbers need re-taking on the actual iPad before anything below is
prioritised on performance grounds.** The desktop figures say the architecture
is not obviously broken; they say nothing about Safari's compositor on an A-series
chip.

## Open

### Drawing correctness

- [ ] Soft brush blur is hard-clipped at region edges by the 0/255 mask alpha;
      threshold-128 against anti-aliased outlines also gives ragged edges.
      Fixing it properly means an anti-aliased (grayscale-alpha) mask instead of
      a binary one.
- [ ] No palm rejection — `event.touches[0]` lets a resting palm hijack drawing.
      The Touch path could prefer `touchType === "stylus"` when any such touch
      is present.
- [ ] Region-locked strokes can't be started by dragging *into* the canvas with
      the button already held: there is no region to lock to yet. Free-draw
      handles this fine. Probably correct as-is, but worth a decision.

### Architecture / scaling

- [ ] **Drop the redundant per-layer `ImageData` mask.** Bounding-box sized now,
      but still duplicates what `lookupTable` encodes. Halves layer memory.
      (`lib/layerGeneration.ts`)
- [ ] **Move region detection to a Web Worker.** Detection is ~9ms of a ~160ms
      load on desktop, so this is load-time polish, not a fix. `generateLayers`
      can't move (needs `document.createElement`). **Only worth it if the iPad
      shows a visible freeze.**
- [ ] **Reconsider N stacked DOM canvases.** 326 absolutely-positioned canvases
      is a lot of compositor layers. Desktop holds ~120fps, so this is
      speculative until measured on the iPad.
- [ ] **`clear()` still snapshots every layer** (~18 MB) into one undo entry.
      Fine for a rare action, but 30 clears would pin ~540 MB. Consider capping
      full-image entries separately from stroke entries.

### Code quality

- [ ] `app/page.tsx` is 60+ hand-written imports plus a hand-maintained id list
      (ids 8–17 are already an unused gap). A build-time generated manifest over
      `assets/images/**` would remove a whole class of copy-paste mistakes.
- [ ] `generateLayers` runs inside `useMemo`, so it creates DOM canvases as a
      render side effect. Harmless in production; under React StrictMode in dev
      it builds them twice.
- [ ] Layer canvases are never explicitly released (`canvas.width = 0`) when
      leaving a picture. GC handles it, but iOS Safari is slow to reclaim canvas
      backing stores. Needs care: a naive `useEffect` cleanup breaks StrictMode.

### Polish

- [ ] No PWA manifest / `apple-mobile-web-app-capable`, so "Add to Home Screen"
      doesn't run fullscreen — the Safari chrome stays visible on the iPad.
- [ ] `MIN_REGION_SIZE` is 10px, which yields 130–330 regions on the detailed
      scenes. Raising it would trade tiny uncolorable nooks for far fewer layers.

## Done

- [x] **Per-region bounding-box sizing.** Layer canvas/mask sized to the region's
      bounding box with an `offsetX/offsetY`, not the full image.
- [x] **`willReadFrequently: true`** on layer contexts.
- [x] **Flat `Int32Array` `pixelToRegion`**, replacing boxed `number[][]`.
- [x] **Lazy per-layer undo snapshots.** A stroke records only the layers it
      actually paints into, and commits one entry when the gesture ends. Free
      drawing on a 326-region picture previously snapshotted *every* layer per
      stroke — ~18 MB per entry, up to ~540 MB across a full history.
- [x] **Strokes released outside the canvas now commit their undo entry.** The
      element's `pointerup` never fires there, so the entry was lost *and* the
      next stroke silently reused the stale capture flag, leaving it unundoable.
- [x] **Only the owning input source can end a gesture.** A stray `pointerup`
      during a Touch-owned Pencil stroke no longer cuts the stroke short.
- [x] **Input-source arbitration** replaced the 50ms wall-clock debounce, which
      dropped legitimate rapid taps and never covered moves.
- [x] **Coalesced pointer events.** Fast Pencil strokes follow every sample
      rather than being reduced to 60Hz straight chords.
- [x] **Cached container `DOMRect` per stroke** — was forcing a layout on every
      pointer sample.
- [x] **Region detection ~4x faster** (35.7ms → 8.9ms on a 326-region picture,
      identical output): no per-pixel `{r,g,b,a}` objects, and a claim-on-push
      `Int32Array` flood-fill stack instead of a `Point[]` one.
- [x] **Image is loaded and decoded once**, not twice under two `Image` elements.
- [x] **Canvas size derives from the image**, not a hardcoded `CANVAS_SIZE = 1000`.
- [x] **Fixed `shrink-0-20`** — a typo'd class that left the portrait undo button
      unsized and unprotected from flex shrink.
- [x] **Saving works on iPad.** An `<a download>` on a data URL doesn't download
      in iOS Safari; it opens the PNG in a new tab with no way back. Now goes
      through the Web Share API (which offers "Save Image") with the download as
      the fallback.
- [x] **Picture selection race fixed** — tapping a second picture mid-load could
      let the first one win.
- [x] **A picture that fails to load now says so** instead of silently bouncing
      back to the gallery.
- [x] **Removed the dead `DEBUG_PERFORMANCE` block** from the pointer-move hot path.
- [x] **De-duplicated the toolbar** (was written out twice, portrait and
      landscape) and the brush buttons.
- [x] **`aria-label` on every icon-only button.**
- [x] **Removed dead code**: `scanlineFill`, `floodFill`, `hexToRgb`/`rgbToHex`,
      `isInBounds`, `getPixelColor`, `isBoundaryPixel`, `lib/pixels.ts`.
- [x] **Edge gaps on fast entry/exit** — fixed by window-level pointer tracking
      that bridges the last off-canvas position to the entry point.
