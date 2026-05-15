"use client"

import { ShapesIcon, PencilIcon, EraserIcon } from "lucide-react"
import { BRUSH_SIZES } from "@/lib/constants"

export type BrushType = "solid" | "soft"
export type BrushSize = "small" | "medium" | "large"

interface BrushSettingsProps {
  size: BrushSize
  onSizeChange: (size: BrushSize) => void
  brushType: BrushType
  onBrushTypeChange: (type: BrushType) => void
  isEraser: boolean
  onEraserChange: (value: boolean) => void
  stayWithinLines: boolean
  onStayWithinLinesChange: (value: boolean) => void
}

export default function BrushSettings({
  size,
  onSizeChange,
  brushType,
  onBrushTypeChange,
  isEraser,
  onEraserChange,
  stayWithinLines,
  onStayWithinLinesChange,
}: BrushSettingsProps) {
  return (
    <div className="flex portrait:contents landscape:flex-col landscape:flex-wrap gap-4">
      {/* Brush Size Buttons */}
      <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-card rounded-xl border-4 border-border portrait:h-20 landscape:w-20 items-center">
        <button
          onClick={() => onSizeChange("small")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            size === "small"
              ? "bg-primary border-primary scale-105"
              : "bg-card border-border hover:border-primary"
          }`}
        >
          <div
            className={`rounded-full ${
              size === "small" ? "bg-primary-foreground" : "bg-foreground"
            }`}
            style={{ width: "12px", height: "12px" }}
          />
        </button>

        <button
          onClick={() => onSizeChange("medium")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            size === "medium"
              ? "bg-primary border-primary scale-105"
              : "bg-card border-border hover:border-primary"
          }`}
        >
          <div
            className={`rounded-full ${
              size === "medium" ? "bg-primary-foreground" : "bg-foreground"
            }`}
            style={{ width: "20px", height: "20px" }}
          />
        </button>

        <button
          onClick={() => onSizeChange("large")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            size === "large"
              ? "bg-primary border-primary scale-105"
              : "bg-card border-border hover:border-primary"
          }`}
        >
          <div
            className={`rounded-full ${
              size === "large" ? "bg-primary-foreground" : "bg-foreground"
            }`}
            style={{ width: "32px", height: "32px" }}
          />
        </button>
      </div>

      {/* Brush Type Buttons */}
      <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-card rounded-xl border-4 border-border portrait:h-20 landscape:w-20 items-center">
        <button
          onClick={() => onBrushTypeChange("solid")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            brushType === "solid"
              ? "bg-primary border-primary scale-105"
              : "bg-card border-border hover:border-primary"
          }`}
        >
          <div
            className={`rounded-full ${
              brushType === "solid"
                ? "bg-primary-foreground"
                : "bg-foreground"
            }`}
            style={{ width: "24px", height: "24px" }}
          />
        </button>

        <button
          onClick={() => onBrushTypeChange("soft")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            brushType === "soft"
              ? "bg-primary border-primary scale-105"
              : "bg-card border-border hover:border-primary"
          }`}
        >
          <div
            className={`rounded-full blur-sm ${
              brushType === "soft" ? "bg-primary-foreground" : "bg-foreground"
            }`}
            style={{ width: "24px", height: "24px" }}
          />
        </button>
      </div>

      {/* Eraser Toggle */}
      <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-card rounded-xl border-4 border-border portrait:h-20 landscape:w-20 items-center">
        <button
          onClick={() => onEraserChange(!isEraser)}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            isEraser
              ? "bg-primary border-primary scale-105"
              : "bg-card border-border hover:border-primary"
          }`}
        >
          <EraserIcon
            className={
              isEraser ? "text-primary-foreground" : "text-foreground"
            }
            size={24}
          />
        </button>
      </div>

      {/* Stay Within Lines Toggle */}
      <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-card rounded-xl border-4 border-border portrait:h-20 landscape:w-20 items-center">
        <button
          onClick={() => onStayWithinLinesChange(true)}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            stayWithinLines
              ? "bg-primary border-primary scale-105"
              : "bg-card border-border hover:border-primary"
          }`}
        >
          <ShapesIcon
            className={
              stayWithinLines ? "text-primary-foreground" : "text-foreground"
            }
            size={32}
          />
        </button>

        <button
          onClick={() => onStayWithinLinesChange(false)}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            !stayWithinLines
              ? "bg-primary border-primary scale-105"
              : "bg-card border-border hover:border-primary"
          }`}
        >
          <PencilIcon
            className={
              !stayWithinLines ? "text-primary-foreground" : "text-foreground"
            }
            size={32}
          />
        </button>
      </div>
    </div>
  )
}

// Export helper to convert BrushSize to pixel value
export function getBrushSizePixels(size: BrushSize): number {
  return BRUSH_SIZES[size]
}
