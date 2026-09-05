"use client"

import { useState, useMemo, useRef } from "react"
import Canvas, { type CanvasRef } from "@/components/Canvas"
import OutlineOverlay from "@/components/OutlineOverlay"
import ColorPicker from "@/components/ColorPicker"
import BrushSettings, {
  type BrushType,
  type BrushSize,
  getBrushSizePixels,
} from "@/components/BrushSettings"
import { ProcessedImageData } from "@/lib/processImage"
import { generateLayers, createLayerLookupTable } from "@/lib/layerGeneration"
import { saveDrawing } from "@/lib/saveDrawing"
import {
  ArrowBigLeftIcon,
  Undo2Icon,
  Redo2Icon,
  Trash2Icon,
  DownloadIcon,
} from "lucide-react"
import { Button } from "./ui/button"
import { APP_BACKGROUND_GRADIENT } from "@/lib/constants"

interface DrawingScreenProps {
  data: ProcessedImageData
  onBack: () => void
}

/** One large square icon button, sized for a small finger. */
function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  hoverBorder = "hover:border-primary",
}: {
  icon: typeof ArrowBigLeftIcon
  label: string
  onClick: () => void
  disabled?: boolean
  hoverBorder?: string
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`shrink-0 size-20 rounded-xl border-4 border-border bg-card disabled:opacity-40 disabled:cursor-not-allowed ${hoverBorder}`}
    >
      <Icon className="size-8" />
    </Button>
  )
}

export default function DrawingScreen({ data, onBack }: DrawingScreenProps) {
  const [fillColor, setFillColor] = useState("#FF0000")
  const [brushSize, setBrushSize] = useState<BrushSize>("medium")
  const [brushType, setBrushType] = useState<BrushType>("solid")
  const [isEraser, setIsEraser] = useState(false)
  const [stayWithinLines, setStayWithinLines] = useState(true)
  const { regionMap, outlineImage } = data

  // Canvas dimensions come from the source image, not a hardcoded constant, so
  // a non-1000px asset lines up instead of silently misaligning.
  const { width: canvasWidth, height: canvasHeight } = regionMap

  // Generate drawable layers from region map (memoized)
  const layers = useMemo(() => generateLayers(regionMap), [regionMap])

  // Create O(1) lookup table for fast layer-at-point queries (memoized)
  const lookupTable = useMemo(
    () => createLayerLookupTable(layers, canvasWidth, canvasHeight),
    [layers, canvasWidth, canvasHeight]
  )

  // Ref to access Canvas undo/redo methods
  const canvasRef = useRef<CanvasRef>(null)

  // Track undo/redo availability in state to trigger re-renders
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const handleSave = () => {
    const canvas = canvasRef.current?.saveToCanvas(outlineImage || undefined)
    if (canvas) void saveDrawing(canvas)
  }

  // Callback from Canvas when drawing state changes
  const handleHistoryChange = () => {
    setCanUndo(canvasRef.current?.canUndo() ?? false)
    setCanRedo(canvasRef.current?.canRedo() ?? false)
  }

  // One definition, rendered in both the landscape column and the portrait row.
  const toolbar = (
    <>
      <ToolButton icon={ArrowBigLeftIcon} label="Back to pictures" onClick={onBack} />
      <ToolButton
        icon={Undo2Icon}
        label="Undo"
        onClick={() => canvasRef.current?.undo()}
        disabled={!canUndo}
      />
      <ToolButton
        icon={Redo2Icon}
        label="Redo"
        onClick={() => canvasRef.current?.redo()}
        disabled={!canRedo}
      />
      <ToolButton
        icon={Trash2Icon}
        label="Clear the picture"
        onClick={() => canvasRef.current?.clear()}
        hoverBorder="hover:border-destructive"
      />
      <ToolButton
        icon={DownloadIcon}
        label="Save the picture"
        onClick={handleSave}
        hoverBorder="hover:border-success"
      />
    </>
  )

  const brushSettings = (
    <BrushSettings
      size={brushSize}
      onSizeChange={setBrushSize}
      brushType={brushType}
      onBrushTypeChange={setBrushType}
      isEraser={isEraser}
      onEraserChange={setIsEraser}
      stayWithinLines={stayWithinLines}
      onStayWithinLinesChange={setStayWithinLines}
    />
  )

  return (
    <div
      className={`flex portrait:flex-col landscape:flex-row gap-4 h-full w-full touch-none landscape:justify-center p-4 ${APP_BACKGROUND_GRADIENT}`}
    >
      {/* Landscape: tools in a left column, brush settings in their own column */}
      <div className="shrink-0 portrait:hidden landscape:flex flex-col gap-4">
        {toolbar}
      </div>
      <div className="shrink-0 portrait:hidden landscape:flex flex-col flex-wrap h-full gap-4">
        {brushSettings}
      </div>

      {/* Portrait: tools and brush settings share one row above the canvas */}
      <div className="shrink-0 portrait:flex landscape:hidden flex-row gap-4 w-full overflow-x-auto touch-pan-x justify-between">
        <div className="flex gap-4">{toolbar}</div>
        {brushSettings}
      </div>

      {/* Canvas (grows to fill available space) */}
      <div className="aspect-square flex items-center justify-center overflow-hidden">
        <div
          className="relative portrait:w-full portrait:max-h-full landscape:h-full landscape:max-w-full border-4 border-border rounded-2xl overflow-hidden"
          style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
        >
          <Canvas
            ref={canvasRef}
            layers={layers}
            lookupTable={lookupTable}
            fillColor={fillColor}
            brushSize={getBrushSizePixels(brushSize)}
            brushType={brushType}
            isEraser={isEraser}
            stayWithinLines={stayWithinLines}
            onHistoryChange={handleHistoryChange}
          />
          {outlineImage && (
            <OutlineOverlay
              outlineImage={outlineImage}
              width={canvasWidth}
              height={canvasHeight}
            />
          )}
        </div>
      </div>

      {/* Color picker - Right column in landscape, bottom row in portrait */}
      <div className="shrink-0 landscape:h-full">
        <ColorPicker selectedColor={fillColor} onColorChange={setFillColor} />
      </div>
    </div>
  )
}
