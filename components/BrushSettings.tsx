"use client"

import { ShapesIcon, PencilIcon } from "lucide-react"

export type BrushType = "solid" | "soft"
export type BrushSize = "small" | "medium" | "large"

interface BrushSettingsProps {
  size: BrushSize
  onSizeChange: (size: BrushSize) => void
  brushType: BrushType
  onBrushTypeChange: (type: BrushType) => void
  stayWithinLines: boolean
  onStayWithinLinesChange: (value: boolean) => void
}

const BRUSH_SIZES = {
  small: 15,
  medium: 25,
  large: 40,
}

export default function BrushSettings({
  size,
  onSizeChange,
  brushType,
  onBrushTypeChange,
  stayWithinLines,
  onStayWithinLinesChange,
}: BrushSettingsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Brush Size Buttons */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border-4 border-gray-300 dark:border-gray-700 shadow-xl">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onSizeChange("small")}
            className={`aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
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
            className={`aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
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
            className={`aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
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
      </div>

      {/* Brush Type Buttons */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border-4 border-gray-300 dark:border-gray-700 shadow-xl">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onBrushTypeChange("solid")}
            className={`aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
              brushType === "solid"
                ? "bg-blue-500 border-blue-600 scale-105"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
            }`}
          >
            <div
              className={`rounded-full ${
                brushType === "solid" ? "bg-white" : "bg-gray-800 dark:bg-gray-200"
              }`}
              style={{ width: "24px", height: "24px" }}
            />
          </button>

          <button
            onClick={() => onBrushTypeChange("soft")}
            className={`aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
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
      </div>

      {/* Stay Within Lines Toggle */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border-4 border-gray-300 dark:border-gray-700 shadow-xl">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onStayWithinLinesChange(true)}
            className={`aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
              stayWithinLines
                ? "bg-blue-500 border-blue-600 scale-105"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
            }`}
          >
            <ShapesIcon
              className={stayWithinLines ? "text-white" : "text-gray-800 dark:text-gray-200"}
              size={32}
            />
          </button>

          <button
            onClick={() => onStayWithinLinesChange(false)}
            className={`aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
              !stayWithinLines
                ? "bg-blue-500 border-blue-600 scale-105"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-blue-400"
            }`}
          >
            <PencilIcon
              className={!stayWithinLines ? "text-white" : "text-gray-800 dark:text-gray-200"}
              size={32}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

// Export helper to convert BrushSize to pixel value
export function getBrushSizePixels(size: BrushSize): number {
  return BRUSH_SIZES[size]
}
