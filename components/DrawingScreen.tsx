"use client"

import { useState } from "react"
import Canvas from "@/components/Canvas"
import OutlineOverlay from "@/components/OutlineOverlay"
import ColorPicker from "@/components/ColorPicker"
import BrushSettings, { type BrushType, type BrushSize, getBrushSizePixels } from "@/components/BrushSettings"
import { ProcessedImageData } from "@/lib/processImage"
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
  const { regionMap, outlineImage } = data

  return (
    <div className="flex flex-row gap-4 h-full overflow-hidden touch-none">
      {/* Left column: Controls */}
      <div className="flex flex-col gap-4 flex-shrink-0 overflow-y-auto touch-pan-y">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border-4 border-gray-300 dark:border-gray-700 shadow-xl">
          <Button variant="outline" className="size-12" onClick={onBack}>
            <ArrowBigLeftIcon />
          </Button>
        </div>
        <BrushSettings
          size={brushSize}
          onSizeChange={setBrushSize}
          brushType={brushType}
          onBrushTypeChange={setBrushType}
        />
      </div>

      {/* Middle column: Canvas */}
      <div className="flex-1 flex items-center justify-center min-w-0 min-h-0 overflow-hidden">
        <div className="relative h-full aspect-square max-w-full border-4 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Drawing canvas (bottom layer) */}
          <Canvas
            regionMap={regionMap}
            size={CANVAS_SIZE}
            fillColor={fillColor}
            brushSize={getBrushSizePixels(brushSize)}
            brushType={brushType}
          />
          {/* Outline overlay (top layer) */}
          {outlineImage && (
            <OutlineOverlay outlineImage={outlineImage} size={CANVAS_SIZE} />
          )}
        </div>
      </div>

      {/* Right column: Color picker */}
      <div className="w-32 flex-shrink-0 overflow-y-auto touch-pan-y">
        <ColorPicker selectedColor={fillColor} onColorChange={setFillColor} />
      </div>
    </div>
  )
}
