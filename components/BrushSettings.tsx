"use client"

import { ShapesIcon, PencilIcon, EraserIcon } from "lucide-react"

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

const BRUSH_SIZES = {
  small: 10,
  medium: 25,
  large: 50,
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
      <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-white dark:bg-gray-800 rounded-xl border-4 border-gray-300 dark:border-gray-700 portrait:h-20 landscape:w-20 items-center">
        <button
          onClick={() => onSizeChange("small")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            size === "small"
              ? "bg-blue-500 border-blue-600 scale-105"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        >
          <div
            className={`rounded-full ${
              size === "small" ? "bg-white" : "bg-gray-800 dark:bg-gray-200"
            }`}
            style={{ width: "12px", height: "12px" }}
          />
        </button>

        <button
          onClick={() => onSizeChange("medium")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            size === "medium"
              ? "bg-blue-500 border-blue-600 scale-105"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        >
          <div
            className={`rounded-full ${
              size === "medium" ? "bg-white" : "bg-gray-800 dark:bg-gray-200"
            }`}
            style={{ width: "20px", height: "20px" }}
          />
        </button>

        <button
          onClick={() => onSizeChange("large")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            size === "large"
              ? "bg-blue-500 border-blue-600 scale-105"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        >
          <div
            className={`rounded-full ${
              size === "large" ? "bg-white" : "bg-gray-800 dark:bg-gray-200"
            }`}
            style={{ width: "32px", height: "32px" }}
          />
        </button>
      </div>

      {/* Brush Type Buttons */}
      <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-white dark:bg-gray-800 rounded-xl border-4 border-gray-300 dark:border-gray-700 portrait:h-20 landscape:w-20 items-center">
        <button
          onClick={() => onBrushTypeChange("solid")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            brushType === "solid"
              ? "bg-blue-500 border-blue-600 scale-105"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        >
          <div
            className={`rounded-full ${
              brushType === "solid"
                ? "bg-white"
                : "bg-gray-800 dark:bg-gray-200"
            }`}
            style={{ width: "24px", height: "24px" }}
          />
        </button>

        <button
          onClick={() => onBrushTypeChange("soft")}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            brushType === "soft"
              ? "bg-blue-500 border-blue-600 scale-105"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        >
          <div
            className={`rounded-full blur-sm ${
              brushType === "soft" ? "bg-white" : "bg-gray-800 dark:bg-gray-200"
            }`}
            style={{ width: "24px", height: "24px" }}
          />
        </button>
      </div>

      {/* Eraser Toggle */}
      <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-white dark:bg-gray-800 rounded-xl border-4 border-gray-300 dark:border-gray-700 portrait:h-20 landscape:w-20 items-center">
        <button
          onClick={() => onEraserChange(!isEraser)}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            isEraser
              ? "bg-blue-500 border-blue-600 scale-105"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        >
          <EraserIcon
            className={
              isEraser ? "text-white" : "text-gray-800 dark:text-gray-200"
            }
            size={24}
          />
        </button>
      </div>

      {/* Stay Within Lines Toggle */}
      <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-white dark:bg-gray-800 rounded-xl border-4 border-gray-300 dark:border-gray-700 portrait:h-20 landscape:w-20 items-center">
        <button
          onClick={() => onStayWithinLinesChange(true)}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            stayWithinLines
              ? "bg-blue-500 border-blue-600 scale-105"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        >
          <ShapesIcon
            className={
              stayWithinLines
                ? "text-white"
                : "text-gray-800 dark:text-gray-200"
            }
            size={32}
          />
        </button>

        <button
          onClick={() => onStayWithinLinesChange(false)}
          className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
            !stayWithinLines
              ? "bg-blue-500 border-blue-600 scale-105"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
          }`}
        >
          <PencilIcon
            className={
              !stayWithinLines
                ? "text-white"
                : "text-gray-800 dark:text-gray-200"
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
