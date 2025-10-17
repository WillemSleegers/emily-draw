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
import { SIGNIFICANT_MOVEMENT_THRESHOLD, FPS_LOG_INTERVAL_MS } from "@/lib/constants"

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
  save: (outlineImage?: HTMLImageElement) => string
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
  const activeLayerRef = useRef<DrawingLayer | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const hasMovedRef = useRef(false)
  const hasStateCapturedRef = useRef(false)

  // Global pointer position tracking (for edge gap fix)
  const lastGlobalPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Track last event time to prevent double-firing from both pointer and touch
  const lastEventTimeRef = useRef<number>(0)

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
    save: (outlineImage?: HTMLImageElement) => {
      if (layers.length === 0) return ""

      // Create a temporary canvas to composite all layers
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = layers[0].canvas.width
      tempCanvas.height = layers[0].canvas.height
      const tempCtx = tempCanvas.getContext("2d")

      if (!tempCtx) return ""

      // Composite all layers onto the temp canvas
      layers.forEach((layer) => {
        tempCtx.drawImage(layer.canvas, 0, 0)
      })

      // If outline image is provided, draw it on top
      if (outlineImage) {
        tempCtx.drawImage(outlineImage, 0, 0, tempCanvas.width, tempCanvas.height)
      }

      // Convert to data URL (PNG format)
      return tempCanvas.toDataURL("image/png")
    },
  }))

  // Mount layer canvases into the DOM
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear container by removing all child nodes using DOM methods
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
      if (layers.length === 0 || !containerRef.current) return

      // Only track position when actively drawing (button is held down)
      // AND when the pointer is over the canvas container
      if (event.buttons === 1) {
        const rect = containerRef.current.getBoundingClientRect()
        const isOverCanvas =
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom

        if (isOverCanvas) {
          // Convert global coordinates to canvas coordinates
          const coords = getCanvasCoordinates(layers[0].canvas, event)
          lastGlobalPositionRef.current = coords
        }
      }
    }

    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: false })
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove)
    }
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

    // Prevent double-firing from both pointer and touch events
    const now = Date.now()
    if (now - lastEventTimeRef.current < 50) return
    lastEventTimeRef.current = now

    const container = containerRef.current
    if (!container || layers.length === 0) return

    // Use first layer canvas for coordinate calculation
    const coords = getCanvasCoordinates(layers[0].canvas, event)

    let targetLayer: DrawingLayer | null = null

    if (stayWithinLines) {
      // Region-locked drawing: find the layer using O(1) lookup table
      const layer = findLayerAtPoint(layers, coords.x, coords.y, lookupTable)
      if (!layer) return
      activeLayerRef.current = layer
      targetLayer = layer
    } else {
      // Free drawing: no layer restrictions
      activeLayerRef.current = null
    }

    // Capture state BEFORE starting to draw (only once per stroke session)
    if (!hasStateCapturedRef.current) {
      const beforeState = captureState()
      undoStackRef.current.push(beforeState)
      redoStackRef.current = [] // Clear redo stack on new action
      hasStateCapturedRef.current = true
    }

    setIsDrawing(true)
    lastPointRef.current = coords
    hasMovedRef.current = false

    // Draw initial dot immediately to ensure quick taps are always visible
    // Use requestAnimationFrame to not block the event handler
    const color = isEraser ? "#FFFFFF" : fillColor
    const currentLayer = targetLayer

    requestAnimationFrame(() => {
      if (stayWithinLines && currentLayer) {
        // Region-locked: draw dot on target layer
        drawStrokeWithClipping(
          currentLayer.canvas,
          currentLayer.ctx,
          currentLayer.mask,
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
            ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2)
            ctx.fill()
          }
        )
      } else if (!stayWithinLines) {
        // Free drawing: draw dot on all layers
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
          layer.ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2)
          layer.ctx.fill()
        })
      }
    })
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

    // Only mark as moved if distance is significant
    const significantMovement = distance > SIGNIFICANT_MOVEMENT_THRESHOLD

    if (stayWithinLines && activeLayerRef.current) {
      // Region-locked drawing with clipping (layer canvas updates automatically in DOM)
      const drawStart = DEBUG_PERFORMANCE ? performance.now() : 0
      const layer = activeLayerRef.current
      drawStrokeWithClipping(
        layer.canvas,
        layer.ctx,
        layer.mask,
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

      // Log FPS and metrics periodically
      frameCountRef.current++
      const now = Date.now()
      if (now - lastFpsTimeRef.current >= FPS_LOG_INTERVAL_MS) {
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
    // Notify parent of history change if we were drawing
    if (isDrawing) {
      onHistoryChange?.()
    }

    setIsDrawing(false)
    activeLayerRef.current = null
    hasStateCapturedRef.current = false
    lastPointRef.current = null
    lastGlobalPositionRef.current = null
    hasMovedRef.current = false
  }

  const handlePointerUpPreserveLayer = () => {
    // Notify parent of history change if we were drawing
    if (isDrawing) {
      onHistoryChange?.()
    }

    setIsDrawing(false)
    // Don't clear activeLayerRef - preserve it for re-entry
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
      if (stayWithinLines && activeLayerRef.current) {
        // Region-locked drawing with clipping (canvas updates automatically in DOM)
        const layer = activeLayerRef.current
        drawStrokeWithClipping(
          layer.canvas,
          layer.ctx,
          layer.mask,
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

    // Stop drawing but preserve the active layer for re-entry
    handlePointerUpPreserveLayer()
  }

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || layers.length === 0) return

    // Check if pointer button is still pressed (buttons === 1 means primary button down)
    if (event.buttons === 1) {
      const coords = getCanvasCoordinates(layers[0].canvas, event)

      // If we have an active layer from before leaving, continue using it
      // Don't find a new layer - this preserves the original drawing region
      const currentLayer = activeLayerRef.current

      if (stayWithinLines && currentLayer) {
        // Continue drawing on the same layer we started with
        const globalPos = lastGlobalPositionRef.current
        if (
          globalPos &&
          (globalPos.x !== coords.x || globalPos.y !== coords.y)
        ) {
          drawStrokeWithClipping(currentLayer.canvas, currentLayer.ctx, currentLayer.mask, (ctx) => {
            applyBrushSettings(ctx)
            ctx.beginPath()
            ctx.moveTo(globalPos.x, globalPos.y)
            ctx.lineTo(coords.x, coords.y)
            ctx.stroke()
          })
        }
      } else if (!stayWithinLines) {
        // Free drawing: draw on all layers
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

      // Resume drawing only if we have a layer to draw on
      if (activeLayerRef.current || !stayWithinLines) {
        setIsDrawing(true)
        lastPointRef.current = coords
      }
    }
  }

  // Add touch event handlers as fallback for Safari's pointer event filtering
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    // Convert touch to pointer-like event
    if (event.touches.length > 0) {
      const touch = event.touches[0]
      const syntheticEvent = {
        preventDefault: () => event.preventDefault(),
        clientX: touch.clientX,
        clientY: touch.clientY,
        pointerType: 'pen',
        pressure: 0.5,
        buttons: 1,
        isPrimary: true,
      } as React.PointerEvent<HTMLDivElement>

      handlePointerDown(syntheticEvent)
    }
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length > 0) {
      const touch = event.touches[0]
      const syntheticEvent = {
        preventDefault: () => event.preventDefault(),
        clientX: touch.clientX,
        clientY: touch.clientY,
        pointerType: 'pen',
        pressure: 0.5,
        buttons: 1,
      } as React.PointerEvent<HTMLDivElement>

      handlePointerMove(syntheticEvent)
    }
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault()
    handlePointerUp()
  }

  return (
    <>
      <div
        ref={containerRef}
        className="aspect-square"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerEnter={handlePointerEnter}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Layer canvases are mounted here via useEffect */}
      </div>
    </>
  )
})

export default Canvas
