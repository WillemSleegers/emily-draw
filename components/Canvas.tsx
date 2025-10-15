"use client"

import { useEffect, useRef, useState } from "react"
import { getCanvasCoordinates } from "@/lib/canvasUtils"
import {
  findLayerAtPoint,
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
  const containerRef = useRef<HTMLDivElement>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [activeLayer, setActiveLayer] = useState<DrawingLayer | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // Global pointer position tracking (for edge gap fix)
  const lastGlobalPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Performance profiling
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(Date.now())
  const performanceMetrics = useRef({
    drawStrokeTime: 0,
    totalMoveTime: 0,
    sampleCount: 0
  })

  // Mount layer canvases into the DOM
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear container
    container.innerHTML = ''

    // Append each layer canvas to the container
    layers.forEach((layer) => {
      layer.canvas.style.position = 'absolute'
      layer.canvas.style.top = '0'
      layer.canvas.style.left = '0'
      layer.canvas.style.width = '100%'
      layer.canvas.style.height = '100%'
      layer.canvas.style.pointerEvents = 'none'
      container.appendChild(layer.canvas)
    })
  }, [layers])

  // Track global pointer position to fix edge gaps on fast entry
  useEffect(() => {
    const handleGlobalPointerMove = (event: PointerEvent) => {
      if (layers.length === 0) return

      // Convert global coordinates to canvas coordinates
      const coords = getCanvasCoordinates(layers[0].canvas, event)
      lastGlobalPositionRef.current = coords
    }

    window.addEventListener('pointermove', handleGlobalPointerMove)
    return () => window.removeEventListener('pointermove', handleGlobalPointerMove)
  }, [layers])

  // Apply brush settings to a context
  const applyBrushSettings = (ctx: CanvasRenderingContext2D) => {
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const container = containerRef.current
    if (!container || layers.length === 0) return

    // Use first layer canvas for coordinate calculation
    const coords = getCanvasCoordinates(layers[0].canvas, event)

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

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !isDrawing || layers.length === 0) return

    event.preventDefault()

    const moveStart = performance.now()

    const coords = getCanvasCoordinates(layers[0].canvas, event)
    const lastPoint = lastPointRef.current

    if (!lastPoint) {
      lastPointRef.current = coords
      return
    }

    if (stayWithinLines && activeLayer) {
      // Region-locked drawing with clipping (layer canvas updates automatically in DOM)
      const drawStart = performance.now()
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
      const drawEnd = performance.now()
      performanceMetrics.current.drawStrokeTime += (drawEnd - drawStart)
    } else if (!stayWithinLines) {
      // Free drawing on all layers
      const drawStart = performance.now()
      layers.forEach(layer => {
        applyBrushSettings(layer.ctx)
        layer.ctx.beginPath()
        layer.ctx.moveTo(lastPoint.x, lastPoint.y)
        layer.ctx.lineTo(coords.x, coords.y)
        layer.ctx.stroke()
      })
      const drawEnd = performance.now()
      performanceMetrics.current.drawStrokeTime += (drawEnd - drawStart)
    }

    const moveEnd = performance.now()
    performanceMetrics.current.totalMoveTime += (moveEnd - moveStart)
    performanceMetrics.current.sampleCount++

    // Log FPS and metrics every second
    frameCountRef.current++
    const now = Date.now()
    if (now - lastFpsTimeRef.current >= 1000) {
      const fps = frameCountRef.current
      const metrics = performanceMetrics.current
      const avgTotal = metrics.sampleCount > 0 ? metrics.totalMoveTime / metrics.sampleCount : 0
      const avgDraw = metrics.sampleCount > 0 ? metrics.drawStrokeTime / metrics.sampleCount : 0

      console.log(`[PERF] FPS: ${fps} | Avg Total: ${avgTotal.toFixed(2)}ms | Avg Draw: ${avgDraw.toFixed(2)}ms`)

      // Reset counters
      frameCountRef.current = 0
      lastFpsTimeRef.current = now
      performanceMetrics.current = {
        drawStrokeTime: 0,
        totalMoveTime: 0,
        sampleCount: 0
      }
    }

    lastPointRef.current = coords
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    setActiveLayer(null)
    lastPointRef.current = null
  }

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !isDrawing || layers.length === 0) {
      // Not drawing, just treat it as pointer up
      handlePointerUp()
      return
    }

    // Get exit coordinates
    const exitCoords = getCanvasCoordinates(layers[0].canvas, event)
    const lastPoint = lastPointRef.current

    // Draw final stroke to exit point if we have a last point
    if (lastPoint && (lastPoint.x !== exitCoords.x || lastPoint.y !== exitCoords.y)) {
      if (stayWithinLines && activeLayer) {
        // Region-locked drawing with clipping (canvas updates automatically in DOM)
        drawStrokeWithClipping(
          activeLayer.canvas,
          activeLayer.ctx,
          activeLayer.mask,
          (ctx) => {
            applyBrushSettings(ctx)
            ctx.beginPath()
            ctx.moveTo(lastPoint.x, lastPoint.y)
            ctx.lineTo(exitCoords.x, exitCoords.y)
            ctx.stroke()
          }
        )
      } else if (!stayWithinLines) {
        // Free drawing on all layers
        layers.forEach(layer => {
          applyBrushSettings(layer.ctx)
          layer.ctx.beginPath()
          layer.ctx.moveTo(lastPoint.x, lastPoint.y)
          layer.ctx.lineTo(exitCoords.x, exitCoords.y)
          layer.ctx.stroke()
        })
      }
    }

    // Stop drawing
    handlePointerUp()
  }

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || layers.length === 0) return

    // Check if pointer button is still pressed (buttons === 1 means primary button down)
    if (event.buttons === 1) {
      const coords = getCanvasCoordinates(layers[0].canvas, event)

      if (stayWithinLines) {
        // Region-locked: find the layer
        const layer = findLayerAtPoint(layers, coords.x, coords.y)
        if (!layer) return
        setActiveLayer(layer)

        // If we have a previous global position, draw from there to fix edge gaps
        const globalPos = lastGlobalPositionRef.current
        if (globalPos && (globalPos.x !== coords.x || globalPos.y !== coords.y)) {
          drawStrokeWithClipping(
            layer.canvas,
            layer.ctx,
            layer.mask,
            (ctx) => {
              applyBrushSettings(ctx)
              ctx.beginPath()
              ctx.moveTo(globalPos.x, globalPos.y)
              ctx.lineTo(coords.x, coords.y)
              ctx.stroke()
            }
          )
        }
      } else {
        // Free drawing: no layer restrictions
        setActiveLayer(null)

        // If we have a previous global position, draw from there to fix edge gaps
        const globalPos = lastGlobalPositionRef.current
        if (globalPos && (globalPos.x !== coords.x || globalPos.y !== coords.y)) {
          layers.forEach(layer => {
            applyBrushSettings(layer.ctx)
            layer.ctx.beginPath()
            layer.ctx.moveTo(globalPos.x, globalPos.y)
            layer.ctx.lineTo(coords.x, coords.y)
            layer.ctx.stroke()
          })
        }
      }

      // Resume drawing
      setIsDrawing(true)
      lastPointRef.current = coords
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerEnter={handlePointerEnter}
    >
      {/* Layer canvases are mounted here via useEffect */}
    </div>
  )
}
