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
- **Automatic Drawing Continuation**: Seamlessly resume drawing when re-entering the canvas while holding down, maintaining the original region

### Technical Stack

This is a Next.js 15 application using the App Router, React Server Components (RSC), TypeScript, and Tailwind CSS v4. The project is configured with shadcn/ui components using the "New York" style variant.

## Architecture

### Tech Stack

- **Framework**: Next.js 15.5.4 with App Router and Turbopack
- **React**: v19.1.0 with React Server Components
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
  - `DrawingScreen.tsx` - Main drawing interface with 3-column responsive layout
  - `Canvas.tsx` - Drawing canvas with region-locked painting logic
  - `OutlineOverlay.tsx` - Overlay that displays the outline image on top of canvas
  - `ColorPicker.tsx` - Color selection component
  - `BrushSettings.tsx` - Brush size and type controls (child-friendly buttons)
  - `ui/` - shadcn/ui components
- `/lib` - Core utilities and algorithms
  - `layerGeneration.ts` - Generate drawable layers from regions with native clipping
  - `regionDetection.ts` - Region detection using flood fill algorithm
  - `floodFill.ts` - Stack-based flood fill implementation
  - `canvasUtils.ts` - Canvas coordinate conversion and boundary detection
  - `imageLoader.ts` - Image loading utilities
  - `processImage.ts` - Image processing pipeline
  - `constants.ts` - Application-wide constants (brush sizes, thresholds, etc.)
  - `utils.ts` - General utilities including `cn()` helper
- `/assets` - Static assets
  - `/images` - Coloring book outline images (1000x1000px PNG files)

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
- Touch events are converted to synthetic pointer events
- 50ms debouncing prevents double-firing when both event types fire
- `requestAnimationFrame` used for non-blocking initial dot rendering
- State capture optimized to only run once per stroke session

### Canvas Drawing Performance

- **Layer-based architecture**: Each region is a separate OffscreenCanvas with native clipping
- **O(1) region lookup**: Uint16Array lookup table for instant region detection
- **Non-blocking rendering**: Use `requestAnimationFrame` for drawing operations
- **Global pointer tracking**: Window-level listeners track position only when pointer is over canvas to eliminate edge gaps

### Drawing State Management

- Use refs (not React state) for `activeLayer` to avoid race conditions
- Preserve active layer when leaving/re-entering canvas to maintain region consistency
- Clear active layer only on final pointer up, not on pointer leave

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
