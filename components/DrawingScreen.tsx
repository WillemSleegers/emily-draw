"use client"

import { useState, useMemo } from "react"
import Canvas from "@/components/Canvas"
import OutlineOverlay from "@/components/OutlineOverlay"
import ColorPicker from "@/components/ColorPicker"
import BrushSettings, {
  type BrushType,
  type BrushSize,
  getBrushSizePixels,
} from "@/components/BrushSettings"
import { ProcessedImageData } from "@/lib/processImage"
import { generateLayers } from "@/lib/layerGeneration"
import { ArrowBigLeftIcon } from "lucide-react"
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

  return (
    <div className="flex portrait:flex-col landscape:flex-row gap-4 h-full w-full touch-none justify-between">
      {/* Controls - Left column in landscape, top row in portrait */}
      <div className="grow-1 w-fit landscape:max-w-50 portrait:max-w-full flex portrait:flex-row landscape:flex-col landscape:flex-wrap landscape:h-full portrait:justify-between gap-4 portrait:overflow-x-auto  portrait:touch-pan-x landscape:touch-pan-y portrait:w-full">
        {/* Back button */}
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-shrink-0 size-20 rounded-xl border-4 border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800"
        >
          <ArrowBigLeftIcon className="size-8" />
        </Button>

        {/* Brush settings */}
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
            layers={layers}
            fillColor={fillColor}
            brushSize={getBrushSizePixels(brushSize)}
            brushType={brushType}
            isEraser={isEraser}
            stayWithinLines={stayWithinLines}
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
