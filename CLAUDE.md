# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Emily Draw** is a digital coloring book application designed for young children (around 3 years old) to color images on touchscreen devices like iPads.

### Core Features

- **Region-Locked Drawing**: Intelligent stay-within-the-lines functionality that automatically detects bounded regions in outline images and prevents coloring outside them
- **Apple Pencil Optimized**: Touch event fallback system ensures reliable drawing with Apple Pencil on iPad, even during quick taps and short strokes
- **Touch-Optimized**: Designed primarily for iPad/touchscreen use with large, easy-to-tap controls and proper touch-action handling
- **Child-Friendly UI**: Large square buttons with visual-only indicators (no text labels) for brush size and type selection
- **Brush Controls**:
  - Three brush sizes (small, medium, large)
  - Two brush types (solid, soft with blur effect)
  - Eraser tool for corrections
- **Color Picker**: Simple color selection interface with visual feedback
- **Undo/Redo**: Full drawing history with undo and redo buttons
- **Save/Export**: Download completed artwork as PNG images
- **Relaxing Sound**: Synthesised (Web Audio, no files) music-box notes while drawing, a pad for the soft brush, a soft whoosh for the eraser, and small phrases for buttons; mute toggle persisted in `localStorage`; the iPad silent switch is respected
- **Automatic Drawing Continuation**: Seamlessly resume drawing when re-entering the canvas while holding down, maintaining the original region

### Technical Stack

This is a Next.js 16 application using the App Router, TypeScript, and Tailwind CSS v4. The project is configured with shadcn/ui components using the "New York" style variant.

Package manager: **pnpm** (`packageManager` is pinned in `package.json`; pnpm-only settings such as `overrides` live in `pnpm-workspace.yaml`, since pnpm 11 no longer reads the `pnpm` field of `package.json`).

```bash
pnpm install
pnpm dev      # next dev --turbopack
pnpm build
pnpm lint
```

## Architecture

### Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **React**: v19.2, with the React Compiler enabled (`reactCompiler: true`) - prefer it over manual `useMemo`/`useCallback`
- **TypeScript**: Strict mode enabled (target: ES2017)
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI Components**: shadcn/ui (New York style) with lucide-react icons
- **Design System**: CSS variables with light/dark mode support using OKLCH color space

### Project Structure

- `/app` - Next.js App Router pages and layouts
  - `layout.tsx` - Root layout with Geist font configuration
  - `page.tsx` - Home page component with image selection
  - `globals.css` - Global styles with Tailwind v4 and theme configuration
- `/components` - React components
  - `ImageGallery.tsx` - Picture chooser, grouped by set
  - `DrawingScreen.tsx` - Main drawing interface, reflowing between portrait and landscape
  - `Canvas.tsx` - Drawing canvas with region-locked painting logic
  - `OutlineOverlay.tsx` - Overlay that displays the outline image on top of canvas
  - `ColorPicker.tsx` - Color selection component
  - `BrushSettings.tsx` - Brush size and type controls (child-friendly buttons)
  - `LoadingScreen.tsx` / `ErrorScreen.tsx` - Wordless loading and failure states
  - `ErrorBoundary.tsx` - Catches render errors and shows `ErrorScreen`
  - `ui/` - shadcn/ui components
- `/lib` - Core utilities and algorithms
  - `layerGeneration.ts` - Generate drawable layers from regions with native clipping
  - `regionDetection.ts` - Region detection using a flat-typed-array flood fill
  - `canvasUtils.ts` - Client-space to image-space coordinate conversion
  - `imageLoader.ts` - Image loading and pixel extraction
  - `processImage.ts` - Image processing pipeline
  - `saveDrawing.ts` - Export the finished artwork (Web Share on iPad, download elsewhere)
  - `sound.ts` - Synthesised drawing sounds, mute state, and audio unlock on first gesture
  - `color.ts` - Hex to HSL conversion (picks each colour's note)
  - `constants.ts` - Application-wide constants (brush sizes, thresholds, etc.)
  - `utils.ts` - General utilities including `cn()` helper
- `/assets` - Static assets
  - `/images` - Coloring book outline images, square SVG (and PNG), imported statically in `app/page.tsx`

### Path Aliases

The project uses `@/*` alias pointing to the root directory:

- `@/components` - UI components
- `@/lib/utils` - Utility functions
- `@/hooks` - React hooks

## Styling Approach

The project uses Tailwind CSS v4 with a custom theme configuration:

- **Color System**: Uses OKLCH color space for better perceptual uniformity
- **Theme Variables**: CSS custom properties defined in `app/globals.css`
- **Dark Mode**: Implemented via `.dark` class with full color variable overrides
- **Animations**: Includes `tw-animate-css` package for additional animations
- **Component Styling**: Use the `cn()` utility from `@/lib/utils` to merge class names with `clsx` and `tailwind-merge`

## UI/UX Design Principles for Children

**Target Audience**: 3-year-old children using iPads and touchscreen devices

### Core Principles

1. **Large Touch Targets**: All interactive elements should be large enough for small fingers to tap accurately (minimum 80px / `h-20` for buttons)
2. **Visual-Only Interface**: Avoid text labels - use visual indicators only (icons, colors, shapes, sizes)
3. **Simple Color Coding**: Use color to indicate state (e.g., blue highlight for selected buttons)
4. **Immediate Feedback**: Provide clear visual feedback on interaction (scale effects, color changes)
5. **Square Buttons**: Use square (`aspect-square`) buttons instead of rectangular for consistency and easier targeting
6. **Minimal Cognitive Load**: Keep interfaces simple with only essential controls visible
7. **Touch-Optimized**: Use `touch-none` on canvas areas to prevent scrolling/zooming during drawing
8. **Separate Control Groups**: Use distinct bordered containers to visually separate different control types

### Design Patterns

- Button states: Selected items use `bg-blue-500 border-blue-600 scale-105`
- Spacing: Use generous gaps (`gap-3`, `gap-4`) between interactive elements
- Borders: Thick borders (`border-4`) for visual clarity
- Rounded corners: `rounded-xl` or `rounded-2xl` for friendly appearance
- Shadow: `shadow-xl` for depth and emphasis on important containers

## shadcn/ui Integration

The project is configured for shadcn/ui components:

```json
{
  "style": "new-york",
  "rsc": true,
  "iconLibrary": "lucide",
  "baseColor": "neutral"
}
```

Add new components using: `npx shadcn@latest add <component-name>`

Components will be added to `@/components/ui` with proper path aliases already configured.

## Important Implementation Details

### Apple Pencil and Touch Events

The Canvas component uses a dual event system to ensure reliable input across all devices:

1. **Pointer Events** (primary): Standard cross-device input handling
2. **Touch Events** (fallback): Catches quick Apple Pencil taps that Safari's Pointer API filters out

Key implementation details:
- Both sources are normalised to a small internal `DrawInput` shape rather than
  casting hand-built objects to `PointerEvent`
- **Input-source arbitration**, not debouncing: whichever source fires first
  claims the gesture via `activeInputSourceRef`, and the other is ignored until
  it ends, so a stroke is never drawn twice
- Only the source owning the gesture may end it, so a stray `pointerup` can't
  cut a Touch-owned Pencil stroke short
- Pointer moves are expanded with `getCoalescedEvents()` so fast Pencil strokes
  follow every sample rather than 60 Hz chords
- `requestAnimationFrame` used for non-blocking initial dot rendering

### Canvas Drawing Performance

- **Layer-based architecture**: Each region is its own `<canvas>`, sized to the
  region's bounding box and clipped natively via `source-atop`
- **O(1) region lookup**: `Uint16Array` lookup table for instant region detection
- **Cached bounds**: The container's `DOMRect` is cached for the duration of a
  stroke - reading it per pointer move forces a layout on every sample
- **Non-blocking rendering**: Use `requestAnimationFrame` for drawing operations
- **Global pointer tracking**: Window-level listeners track position only when pointer is over canvas to eliminate edge gaps

### Drawing State Management

- Use refs (not React state) for `activeLayer` to avoid race conditions
- Preserve active layer when leaving/re-entering canvas to maintain region consistency
- Clear active layer only on final pointer up, not on pointer leave
- **Undo snapshots are taken lazily**, per layer, the first time a stroke paints
  into it (`rememberLayerForUndo`), and committed as one entry when the gesture
  ends. Snapshotting every layer up front would cost ~18 MB per entry on a
  300-region picture in free-draw mode.
- The window-level gesture-end listener is what commits the entry when the
  pointer is released *outside* the canvas, where the element's own handlers
  never fire.

## TypeScript Configuration

- Strict mode enabled
- Path alias `@/*` for imports from root
- JSX preserved (handled by Next.js)
- Module resolution: bundler
- Target: ES2017

## ESLint Configuration

Uses Next.js recommended configs:

- `next/core-web-vitals`
- `next/typescript`

Ignores: `node_modules/`, `.next/`, `out/`, `build/`, `next-env.d.ts`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
