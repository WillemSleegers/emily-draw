"use client"

import { useEffect, useRef, useState } from "react"
import { getCanvasCoordinates } from "@/lib/canvasUtils"
import {
  findLayerAtPoint,
  compositeLayers,
  drawStrokeWithClipping,
  type DrawingLayer,
} from "@/lib/layerGeneration"
import type { BrushType } from "./BrushSettings"

interface CanvasProps {
  layers: DrawingLayer[]
  size: number
  fillColor: string
  brushSize: number
  brushType: BrushType
  stayWithinLines: boolean
}

export default function Canvas({ layers, size, fillColor, brushSize, brushType, stayWithinLines }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [activeLayer, setActiveLayer] = useState<DrawingLayer | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas to fixed dimensions
    canvas.width = size
    canvas.height = size

    // Initial composite of all layers
    const ctx = canvas.getContext("2d")
    if (ctx) {
      compositeLayers(ctx, layers, size, size)
    }
  }, [size, layers])

  // Apply brush settings to a context
  const applyBrushSettings = (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ) => {
    ctx.strokeStyle = fillColor
    ctx.lineWidth = brushSize
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    // Apply brush-specific settings
    if (brushType === "soft") {
      ctx.shadowBlur = brushSize * 0.5
      ctx.shadowColor = fillColor
    } else {
      ctx.globalAlpha = 1.0
      ctx.shadowBlur = 0
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const coords = getCanvasCoordinates(canvas, event)

    if (stayWithinLines) {
      // Region-locked drawing: find the layer
      const layer = findLayerAtPoint(layers, coords.x, coords.y)
      if (!layer) return
      setActiveLayer(layer)
    } else {
      // Free drawing: no layer restrictions
      setActiveLayer(null)
    }

    setIsDrawing(true)
    lastPointRef.current = coords
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !isDrawing) return

    event.preventDefault()

    const coords = getCanvasCoordinates(canvas, event)
    const lastPoint = lastPointRef.current

    if (!lastPoint) {
      lastPointRef.current = coords
      return
    }

    if (stayWithinLines && activeLayer) {
      // Region-locked drawing with clipping
      drawStrokeWithClipping(
        activeLayer.canvas,
        activeLayer.ctx,
        activeLayer.mask,
        (ctx) => {
          applyBrushSettings(ctx)
          ctx.beginPath()
          ctx.moveTo(lastPoint.x, lastPoint.y)
          ctx.lineTo(coords.x, coords.y)
          ctx.stroke()
        }
      )

      // Update display canvas
      const displayCtx = canvas.getContext("2d")
      if (displayCtx) {
        compositeLayers(displayCtx, layers, size, size)
      }
    } else if (!stayWithinLines) {
      // Free drawing directly on display canvas
      const displayCtx = canvas.getContext("2d")
      if (displayCtx) {
        applyBrushSettings(displayCtx)
        displayCtx.beginPath()
        displayCtx.moveTo(lastPoint.x, lastPoint.y)
        displayCtx.lineTo(coords.x, coords.y)
        displayCtx.stroke()
      }
    }

    lastPointRef.current = coords
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    setActiveLayer(null)
    lastPointRef.current = null
  }

  const handlePointerEnter = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Check if pointer button is still pressed (buttons === 1 means primary button down)
    if (event.buttons === 1) {
      const coords = getCanvasCoordinates(canvas, event)

      if (stayWithinLines) {
        // Region-locked: find the layer
        const layer = findLayerAtPoint(layers, coords.x, coords.y)
        if (!layer) return
        setActiveLayer(layer)
      } else {
        // Free drawing: no layer restrictions
        setActiveLayer(null)
      }

      // Resume drawing
      setIsDrawing(true)
      lastPointRef.current = coords
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-full touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerEnter={handlePointerEnter}
    />
  )
}
