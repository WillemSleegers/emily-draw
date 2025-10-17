"use client"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"
import { getCanvasCoordinates } from "@/lib/canvasUtils"
import {
  findLayerAtPoint,
  drawStrokeWithClipping,
  type DrawingLayer,
  type LayerLookupTable,
} from "@/lib/layerGeneration"
import type { BrushType } from "./BrushSettings"

interface CanvasProps {
  layers: DrawingLayer[]
  lookupTable: LayerLookupTable
  fillColor: string
  brushSize: number
  brushType: BrushType
  isEraser: boolean
  stayWithinLines: boolean
  onHistoryChange?: () => void
}

export interface CanvasRef {
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

// Performance debugging flag - set to true only during development
const DEBUG_PERFORMANCE = false

const Canvas = forwardRef<CanvasRef, CanvasProps>(function Canvas({
  layers,
  lookupTable,
  fillColor,
  brushSize,
  brushType,
  isEraser,
  stayWithinLines,
  onHistoryChange,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [activeLayer, setActiveLayer] = useState<DrawingLayer | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const hasMovedRef = useRef(false)

  // Global pointer position tracking (for edge gap fix)
  const lastGlobalPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Performance profiling (only active when DEBUG_PERFORMANCE is true)
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(Date.now())
  const performanceMetrics = useRef({
    drawStrokeTime: 0,
    totalMoveTime: 0,
    sampleCount: 0,
  })

  // Undo/redo history - store ImageData snapshots
  const undoStackRef = useRef<Map<number, ImageData>[]>([])
  const redoStackRef = useRef<Map<number, ImageData>[]>([])

  // Capture current state of all layers
  const captureState = (): Map<number, ImageData> => {
    const state = new Map<number, ImageData>()
    layers.forEach((layer) => {
      const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height)
      state.set(layer.id, imageData)
    })
    return state
  }

  // Restore state to all layers
  const restoreState = (state: Map<number, ImageData>) => {
    layers.forEach((layer) => {
      const imageData = state.get(layer.id)
      if (imageData) {
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
        layer.ctx.putImageData(imageData, 0, 0)
      }
    })
  }

  // Expose undo/redo methods via ref
  useImperativeHandle(ref, () => ({
    undo: () => {
      if (undoStackRef.current.length === 0) return

      // Save current state to redo stack
      const currentState = captureState()
      redoStackRef.current.push(currentState)

      // Pop and restore from undo stack
      const stateToRestore = undoStackRef.current.pop()!
      restoreState(stateToRestore)

      // Notify parent of history change
      onHistoryChange?.()
    },
    redo: () => {
      if (redoStackRef.current.length === 0) return

      // Save current state to undo stack
      const currentState = captureState()
      undoStackRef.current.push(currentState)

      // Pop and restore from redo stack
      const stateToRestore = redoStackRef.current.pop()!
      restoreState(stateToRestore)

      // Notify parent of history change
      onHistoryChange?.()
    },
    canUndo: () => undoStackRef.current.length > 0,
    canRedo: () => redoStackRef.current.length > 0,
    clear: () => {
      // Save current state to undo stack before clearing
      const currentState = captureState()
      undoStackRef.current.push(currentState)
      redoStackRef.current = [] // Clear redo stack

      // Clear all layers and restore the white mask background
      layers.forEach((layer) => {
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
        // Restore the white mask pixels that define the drawable region
        layer.ctx.putImageData(layer.mask, 0, 0)
      })

      // Notify parent of history change
      onHistoryChange?.()
    },
  }))

  // Mount layer canvases into the DOM
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear container by removing all child nodes properly
    // This avoids memory leaks from innerHTML = ""
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    // Append each layer canvas to the container
    layers.forEach((layer) => {
      layer.canvas.style.position = "absolute"
      layer.canvas.style.top = "0"
      layer.canvas.style.left = "0"
      layer.canvas.style.width = "100%"
      layer.canvas.style.height = "100%"
      layer.canvas.style.pointerEvents = "none"
      container.appendChild(layer.canvas)
    })

    // Initialize empty undo/redo stacks
    // We'll capture state when drawing starts
    undoStackRef.current = []
    redoStackRef.current = []

    // Cleanup function to remove canvases when component unmounts or layers change
    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
    }
  }, [layers])

  // Track global pointer position to fix edge gaps on fast entry
  useEffect(() => {
    const handleGlobalPointerMove = (event: PointerEvent) => {
      if (layers.length === 0) return

      // Only track position when actively drawing (button is held down)
      // This prevents capturing positions from UI interactions like color picker clicks
      if (event.buttons === 1) {
        // Convert global coordinates to canvas coordinates
        const coords = getCanvasCoordinates(layers[0].canvas, event)
        lastGlobalPositionRef.current = coords
      }
    }

    window.addEventListener("pointermove", handleGlobalPointerMove)
    return () =>
      window.removeEventListener("pointermove", handleGlobalPointerMove)
  }, [layers])

  // Apply brush settings to a context
  const applyBrushSettings = (ctx: CanvasRenderingContext2D) => {
    // Use white for eraser, otherwise use selected color
    const color = isEraser ? "#FFFFFF" : fillColor

    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    // Apply shadow for soft brush (but not for eraser)
    if (brushType === "soft" && !isEraser) {
      ctx.shadowBlur = brushSize * 0.5
      ctx.shadowColor = color
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
      // Region-locked drawing: find the layer using O(1) lookup table
      const layer = findLayerAtPoint(layers, coords.x, coords.y, lookupTable)
      if (!layer) return
      setActiveLayer(layer)
    } else {
      // Free drawing: no layer restrictions
      setActiveLayer(null)
    }

    // Capture state BEFORE starting to draw
    const beforeState = captureState()
    undoStackRef.current.push(beforeState)
    redoStackRef.current = [] // Clear redo stack on new action

    setIsDrawing(true)
    lastPointRef.current = coords
    hasMovedRef.current = false
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !isDrawing || layers.length === 0) return

    event.preventDefault()

    const moveStart = DEBUG_PERFORMANCE ? performance.now() : 0

    const coords = getCanvasCoordinates(layers[0].canvas, event)
    const lastPoint = lastPointRef.current

    if (!lastPoint) {
      lastPointRef.current = coords
      return
    }

    // Calculate distance moved to detect actual movement vs. jitter
    const dx = coords.x - lastPoint.x
    const dy = coords.y - lastPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Only mark as moved if distance is significant (more than 2 pixels)
    const significantMovement = distance > 2

    if (stayWithinLines && activeLayer) {
      // Region-locked drawing with clipping (layer canvas updates automatically in DOM)
      const drawStart = DEBUG_PERFORMANCE ? performance.now() : 0
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
      if (DEBUG_PERFORMANCE) {
        const drawEnd = performance.now()
        performanceMetrics.current.drawStrokeTime += drawEnd - drawStart
      }
      if (significantMovement) hasMovedRef.current = true
    } else if (!stayWithinLines) {
      // Free drawing on all layers
      const drawStart = DEBUG_PERFORMANCE ? performance.now() : 0
      layers.forEach((layer) => {
        applyBrushSettings(layer.ctx)
        layer.ctx.beginPath()
        layer.ctx.moveTo(lastPoint.x, lastPoint.y)
        layer.ctx.lineTo(coords.x, coords.y)
        layer.ctx.stroke()
      })
      if (DEBUG_PERFORMANCE) {
        const drawEnd = performance.now()
        performanceMetrics.current.drawStrokeTime += drawEnd - drawStart
      }
      if (significantMovement) hasMovedRef.current = true
    }

    // Performance tracking (only when DEBUG_PERFORMANCE is enabled)
    if (DEBUG_PERFORMANCE) {
      const moveEnd = performance.now()
      performanceMetrics.current.totalMoveTime += moveEnd - moveStart
      performanceMetrics.current.sampleCount++

      // Log FPS and metrics every second
      frameCountRef.current++
      const now = Date.now()
      if (now - lastFpsTimeRef.current >= 1000) {
        const fps = frameCountRef.current
        const metrics = performanceMetrics.current
        const avgTotal =
          metrics.sampleCount > 0
            ? metrics.totalMoveTime / metrics.sampleCount
            : 0
        const avgDraw =
          metrics.sampleCount > 0
            ? metrics.drawStrokeTime / metrics.sampleCount
            : 0

        console.log(
          `[PERF] FPS: ${fps} | Avg Total: ${avgTotal.toFixed(
            2
          )}ms | Avg Draw: ${avgDraw.toFixed(2)}ms`
        )

        // Reset counters
        frameCountRef.current = 0
        lastFpsTimeRef.current = now
        performanceMetrics.current = {
          drawStrokeTime: 0,
          totalMoveTime: 0,
          sampleCount: 0,
        }
      }
    }

    lastPointRef.current = coords
  }

  const handlePointerUp = () => {
    // Check if this was a click without movement (draw a circle)
    const lastPoint = lastPointRef.current
    if (lastPoint && isDrawing && !hasMovedRef.current) {
      // Use white for eraser, otherwise use selected color
      const color = isEraser ? "#FFFFFF" : fillColor

      // Draw a circle at the click point
      if (stayWithinLines && activeLayer) {
        // Region-locked: draw circle on active layer
        drawStrokeWithClipping(
          activeLayer.canvas,
          activeLayer.ctx,
          activeLayer.mask,
          (ctx) => {
            ctx.fillStyle = color
            ctx.globalAlpha = 1.0

            // Apply shadow for soft brush (but not for eraser)
            if (brushType === "soft" && !isEraser) {
              ctx.shadowBlur = brushSize * 0.5
              ctx.shadowColor = color
            } else {
              ctx.shadowBlur = 0
            }

            ctx.beginPath()
            ctx.arc(lastPoint.x, lastPoint.y, brushSize / 2, 0, Math.PI * 2)
            ctx.fill()
          }
        )
      } else if (!stayWithinLines) {
        // Free drawing: draw circle on all layers
        layers.forEach((layer) => {
          layer.ctx.fillStyle = color
          layer.ctx.globalAlpha = 1.0

          // Apply shadow for soft brush (but not for eraser)
          if (brushType === "soft" && !isEraser) {
            layer.ctx.shadowBlur = brushSize * 0.5
            layer.ctx.shadowColor = color
          } else {
            layer.ctx.shadowBlur = 0
          }

          layer.ctx.beginPath()
          layer.ctx.arc(lastPoint.x, lastPoint.y, brushSize / 2, 0, Math.PI * 2)
          layer.ctx.fill()
        })
      }
    }

    // Notify parent of history change if we were drawing
    if (isDrawing) {
      onHistoryChange?.()
    }

    setIsDrawing(false)
    setActiveLayer(null)
    lastPointRef.current = null
    lastGlobalPositionRef.current = null
    hasMovedRef.current = false
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
    if (
      lastPoint &&
      (lastPoint.x !== exitCoords.x || lastPoint.y !== exitCoords.y)
    ) {
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
        layers.forEach((layer) => {
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
        // Region-locked: find the layer using O(1) lookup table
        const layer = findLayerAtPoint(layers, coords.x, coords.y, lookupTable)
        if (!layer) return
        setActiveLayer(layer)

        // If we have a previous global position, draw from there to fix edge gaps
        const globalPos = lastGlobalPositionRef.current
        if (
          globalPos &&
          (globalPos.x !== coords.x || globalPos.y !== coords.y)
        ) {
          drawStrokeWithClipping(layer.canvas, layer.ctx, layer.mask, (ctx) => {
            applyBrushSettings(ctx)
            ctx.beginPath()
            ctx.moveTo(globalPos.x, globalPos.y)
            ctx.lineTo(coords.x, coords.y)
            ctx.stroke()
          })
        }
      } else {
        // Free drawing: no layer restrictions
        setActiveLayer(null)

        // If we have a previous global position, draw from there to fix edge gaps
        const globalPos = lastGlobalPositionRef.current
        if (
          globalPos &&
          (globalPos.x !== coords.x || globalPos.y !== coords.y)
        ) {
          layers.forEach((layer) => {
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
      className="aspect-square touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerEnter={handlePointerEnter}
    >
      {/* Layer canvases are mounted here via useEffect */}
    </div>
  )
})

export default Canvas
export type { CanvasRef }
