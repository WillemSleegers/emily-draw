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
import { ArrowBigLeftIcon, Undo2Icon, Redo2Icon } from "lucide-react"
import { Button } from "./ui/button"

// Fixed canvas dimensions (all images are 1000x1000)
const CANVAS_SIZE = 1000

interface DrawingScreenProps {
  data: ProcessedImageData
  onBack: () => void
}

export default function DrawingScreen({ data, onBack }: DrawingScreenProps) {
  const [fillColor, setFillColor] = useState("#FF0000")
  const [brushSize, setBrushSize] = useState<BrushSize>("medium")
  const [brushType, setBrushType] = useState<BrushType>("solid")
  const [isEraser, setIsEraser] = useState(false)
  const [stayWithinLines, setStayWithinLines] = useState(true)
  const { regionMap, outlineImage } = data

  // Generate drawable layers from region map (memoized)
  const layers = useMemo(() => {
    return generateLayers(regionMap)
  }, [regionMap])

  // Create O(1) lookup table for fast layer-at-point queries (memoized)
  const lookupTable = useMemo(() => {
    return createLayerLookupTable(layers, CANVAS_SIZE, CANVAS_SIZE)
  }, [layers])

  // Ref to access Canvas undo/redo methods
  const canvasRef = useRef<CanvasRef>(null)

  // Track undo/redo availability in state to trigger re-renders
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Handlers that call Canvas methods and update button states
  const handleUndo = () => {
    canvasRef.current?.undo()
    // Update button states after undo
    setCanUndo(canvasRef.current?.canUndo() ?? false)
    setCanRedo(canvasRef.current?.canRedo() ?? false)
  }

  const handleRedo = () => {
    canvasRef.current?.redo()
    // Update button states after redo
    setCanUndo(canvasRef.current?.canUndo() ?? false)
    setCanRedo(canvasRef.current?.canRedo() ?? false)
  }

  // Callback from Canvas when drawing state changes
  const handleHistoryChange = () => {
    setCanUndo(canvasRef.current?.canUndo() ?? false)
    setCanRedo(canvasRef.current?.canRedo() ?? false)
  }

  return (
    <div className="flex portrait:flex-col landscape:flex-row gap-4 h-full w-full touch-none landscape:justify-between p-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-950 dark:via-purple-950 dark:to-blue-950">
      {/* Back button and undo/redo - separate column in landscape, in row in portrait */}
      <div className="flex-shrink-0 portrait:hidden landscape:flex flex-col gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="size-20 rounded-xl border-4 border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800"
        >
          <ArrowBigLeftIcon className="size-8" />
        </Button>
        <Button
          variant="outline"
          onClick={handleUndo}
          disabled={!canUndo}
          className="size-20 rounded-xl border-4 border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2Icon className="size-8" />
        </Button>
        <Button
          variant="outline"
          onClick={handleRedo}
          disabled={!canRedo}
          className="size-20 rounded-xl border-4 border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Redo2Icon className="size-8" />
        </Button>
      </div>

      {/* Controls row for portrait (includes back button + undo/redo + controls) */}
      <div className="flex-shrink-0 portrait:flex landscape:hidden flex-row gap-4 w-full overflow-x-auto touch-pan-x justify-between">
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-shrink-0 size-20 rounded-xl border-4 border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800"
          >
            <ArrowBigLeftIcon className="size-8" />
          </Button>
          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex-shrink-0 size-20 rounded-xl border-4 border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Undo2Icon className="size-8" />
          </Button>
          <Button
            variant="outline"
            onClick={handleRedo}
            disabled={!canRedo}
            className="flex-shrink-0 size-20 rounded-xl border-4 border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Redo2Icon className="size-8" />
          </Button>
        </div>
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
      </div>

      {/* Brush settings column for landscape */}
      <div className="flex-shrink-0 portrait:hidden landscape:flex flex-col flex-wrap h-full gap-4">
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
      </div>

      {/* Canvas (grows to fill available space) */}
      <div className="aspect-square flex items-center justify-center overflow-hidden">
        <div className="relative aspect-square portrait:w-full portrait:max-h-full landscape:h-full landscape:max-w-full border-4 border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden">
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
            <OutlineOverlay outlineImage={outlineImage} size={CANVAS_SIZE} />
          )}
        </div>
      </div>

      {/* Color picker - Right column in landscape, bottom row in portrait */}
      <div className="flex-shrink-0 landscape:h-full">
        <ColorPicker selectedColor={fillColor} onColorChange={setFillColor} />
      </div>
    </div>
  )
}
