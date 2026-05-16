# How to add more coloring images

Adding a picture to the gallery is two steps: drop a PNG into `assets/images/`,
then register it in `app/page.tsx`. Everything else — region detection, the
stay-within-the-lines layers, the gallery thumbnail — is automatic.

## 1. Prepare the image file

The artwork is an **outline image**: black line art that the child colors
underneath. It must be:

- **1000 × 1000 pixels.** This is a hard requirement — the canvas, the region
  lookup table, and the outline overlay all assume it. A different size will
  misalign or break.
- **PNG background can be transparent OR white.** Either convention works.
  The outline overlay uses `mix-blend-mode: multiply`, where white acts as
  the identity (it doesn't paint over the artwork beneath the lines) and
  transparent passes through unchanged. Inside the outlines, white and
  transparent are both treated as colorable space by region detection.
- **Dark outlines.** Region detection treats any pixel darker than
  `BOUNDARY_THRESHOLD` (128 brightness, see `lib/constants.ts`) as a line.
  Black or near-black lines work best; light grey lines won't be detected as
  boundaries.
- **Closed shapes.** A fillable region is an area fully enclosed by dark lines.
  If an outline has a gap, the "inside" and "outside" merge into one region and
  the stay-within-the-lines lock won't behave as expected.

## 2. Drop it in `assets/images/`

Name it in lowercase kebab-case, e.g. `assets/images/rocket.png`.

## 3. Register it in `app/page.tsx`

Two small additions:

**a. Add an import** alongside the others (the list is kept alphabetical):

```ts
import rocketImage from "@/assets/images/rocket.png"
```

**b. Add an entry to the `IMAGES` array.** Give it the next unused `id`, a
display `name`, and the imported `src`:

```ts
const IMAGES = [
  // ...existing entries...
  { id: 16, name: "Brontosaurus", src: brontosaurusImage },
  { id: 17, name: "Rocket", src: rocketImage },
]
```

`id` must be unique (just use the next integer). `name` is used as the image's
alt text — it isn't shown to the child.

That's it. Save, and the new picture appears in the gallery.

## What happens under the hood

When a child taps the image, `processImage` (`lib/processImage.ts`) runs:

1. `detectRegions` flood-fills the picture into separate regions, then dilates
   each region a couple of pixels into the outline so colors meet the lines
   cleanly (no white halo).
2. `generateLayers` builds one bounding-box-sized canvas per region.
3. The child's strokes are clipped to whichever region they started in.

Regions smaller than `MIN_REGION_SIZE` (100 px, in `lib/constants.ts`) are
discarded and folded into the outline — so tiny enclosed nooks won't become
their own colorable areas.

## Tips for images that color well

- **Bold, continuous outlines.** Thin or broken lines detect poorly.
- **Not too many tiny regions.** Each region is its own canvas; a picture with
  dozens of slivers costs more memory and detection time. Aim for a handful of
  big, satisfying areas — it's a coloring book for a 3-year-old.
- **Simple, recognizable subjects.** Look at the existing images
  (`balloon`, `elephant`, `sun`) for the right level of detail.
- **Test it.** Open the image in the app and check that each area locks
  independently and that colors reach the outline.
