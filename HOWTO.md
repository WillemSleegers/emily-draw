# How to add more coloring images

Adding a picture to the gallery is two steps: drop an SVG or PNG into
`assets/images/<group>/`, then register it in `app/page.tsx`. Everything else —
region detection, the stay-within-the-lines layers, the gallery thumbnail — is
automatic.

## 1. Prepare the image file

The artwork is an **outline image**: black line art that the child colors
underneath. It must be:

- **Square, and around 1000 × 1000.** The canvas and lookup table are built
  from the image's own dimensions, so a different size won't misalign — but the
  layout reserves a square, and detection cost scales with pixel count. An SVG
  needs explicit `width`/`height` attributes; without them the browser reports
  no intrinsic size and the loader falls back to 1000 × 1000.
- **Background can be transparent OR white.** Either convention works.
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

Name it in lowercase kebab-case inside the group folder it belongs to, e.g.
`assets/images/basic-shapes/rocket.svg`.

## 3. Register it in `app/page.tsx`

Two small additions:

**a. Add an import** alongside the others (the list is kept alphabetical):

```ts
import rocketImage from "@/assets/images/basic-shapes/rocket.svg"
```

**b. Add an entry to the right group in `IMAGE_GROUPS`.** Give it the next
unused `id`, a display `name`, and the imported `src`:

```ts
const IMAGE_GROUPS = [
  {
    name: "Basic Shapes",
    images: [
      // ...existing entries...
      { id: 8, name: "Rocket", src: rocketImage },
    ],
  },
  // ...other groups...
]
```

`id` must be unique across every group (just use the next unused integer).
`name` becomes the image's alt text and its accessible label — it isn't shown
to the child.

That's it. Save, and the new picture appears in the gallery.

## What happens under the hood

When a child taps the image, `processImage` (`lib/processImage.ts`) runs:

1. `detectRegions` flood-fills the picture into separate regions, then dilates
   each region a couple of pixels into the outline so colors meet the lines
   cleanly (no white halo).
2. `generateLayers` builds one bounding-box-sized canvas per region.
3. The child's strokes are clipped to whichever region they started in.

Regions smaller than `MIN_REGION_SIZE` (10 px, in `lib/constants.ts`) are
discarded and folded into the outline — so tiny enclosed nooks won't become
their own colorable areas. Raising this is the main lever if a detailed picture
produces too many slivers.

## Tips for images that color well

- **Bold, continuous outlines.** Thin or broken lines detect poorly.
- **Not too many tiny regions.** Each region is its own canvas. The detailed
  Coloring Bunny scenes produce 130–330 layers each, which the app handles, but
  a 3-year-old gets more out of a handful of big, satisfying areas.
- **Simple, recognizable subjects.** Look at `assets/images/basic-shapes/` for
  the level of detail that colors best at this age.
- **Test it.** Open the image in the app and check that each area locks
  independently and that colors reach the outline.
