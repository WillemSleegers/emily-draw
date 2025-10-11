# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

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
  - `page.tsx` - Home page component
  - `globals.css` - Global styles with Tailwind v4 and theme configuration
- `/lib` - Shared utilities
  - `utils.ts` - Contains `cn()` helper for merging Tailwind classes
- `/components` - React components (to be added via shadcn/ui CLI)
- `/public` - Static assets

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