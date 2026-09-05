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

/** A bordered container that stacks its buttons along the short axis. */
function ToolGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex portrait:flex-row landscape:flex-col gap-3 p-2 bg-card rounded-xl border-4 border-border portrait:h-20 landscape:w-20 items-center">
      {children}
    </div>
  )
}

/**
 * One square option button. `selected` is both the visual state and the
 * accessible state - these are the app's only labels, since a three-year-old
 * can't read.
 */
function ToggleButton({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      className={`h-14 aspect-square rounded-xl border-4 flex items-center justify-center transition-all ${
        selected
          ? "bg-primary border-primary scale-105"
          : "bg-card border-border hover:border-primary"
      }`}
    >
      {children}
    </button>
  )
}

/** The dot preview inside a brush-size / brush-type button. */
function Dot({ px, selected, soft }: { px: number; selected: boolean; soft?: boolean }) {
  return (
    <div
      className={`rounded-full ${soft ? "blur-sm" : ""} ${
        selected ? "bg-primary-foreground" : "bg-foreground"
      }`}
      style={{ width: px, height: px }}
    />
  )
}

const SIZE_OPTIONS: { value: BrushSize; previewPx: number; label: string }[] = [
  { value: "small", previewPx: 12, label: "Small brush" },
  { value: "medium", previewPx: 20, label: "Medium brush" },
  { value: "large", previewPx: 32, label: "Big brush" },
]

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
      <ToolGroup>
        {SIZE_OPTIONS.map(({ value, previewPx, label }) => (
          <ToggleButton
            key={value}
            selected={size === value}
            onClick={() => onSizeChange(value)}
            label={label}
          >
            <Dot px={previewPx} selected={size === value} />
          </ToggleButton>
        ))}
      </ToolGroup>

      <ToolGroup>
        <ToggleButton
          selected={brushType === "solid"}
          onClick={() => onBrushTypeChange("solid")}
          label="Solid brush"
        >
          <Dot px={24} selected={brushType === "solid"} />
        </ToggleButton>
        <ToggleButton
          selected={brushType === "soft"}
          onClick={() => onBrushTypeChange("soft")}
          label="Soft brush"
        >
          <Dot px={24} selected={brushType === "soft"} soft />
        </ToggleButton>
      </ToolGroup>

      <ToolGroup>
        <ToggleButton
          selected={isEraser}
          onClick={() => onEraserChange(!isEraser)}
          label="Eraser"
        >
          <EraserIcon
            className={isEraser ? "text-primary-foreground" : "text-foreground"}
            size={24}
          />
        </ToggleButton>
      </ToolGroup>

      <ToolGroup>
        <ToggleButton
          selected={stayWithinLines}
          onClick={() => onStayWithinLinesChange(true)}
          label="Stay inside the lines"
        >
          <ShapesIcon
            className={stayWithinLines ? "text-primary-foreground" : "text-foreground"}
            size={32}
          />
        </ToggleButton>
        <ToggleButton
          selected={!stayWithinLines}
          onClick={() => onStayWithinLinesChange(false)}
          label="Draw anywhere"
        >
          <PencilIcon
            className={!stayWithinLines ? "text-primary-foreground" : "text-foreground"}
            size={32}
          />
        </ToggleButton>
      </ToolGroup>
    </div>
  )
}

// Export helper to convert BrushSize to pixel value
export function getBrushSizePixels(size: BrushSize): number {
  return BRUSH_SIZES[size]
}
