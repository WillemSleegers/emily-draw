"use client"

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react"
import { getCanvasCoordinates } from "@/lib/canvasUtils"
import {
  findLayerAtPoint,
  drawStrokeWithClipping,
  type DrawingLayer,
  type LayerLookupTable,
} from "@/lib/layerGeneration"
import type { BrushType } from "./BrushSettings"
import { FPS_LOG_INTERVAL_MS, MAX_HISTORY } from "@/lib/constants"

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

// A history entry: the "before" pixels of every layer the stroke touched.
type HistoryEntry = Map<number, ImageData>

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
  const hasStateCapturedRef = useRef(false)

  // Global pointer position tracking (for edge gap fix)
  const lastGlobalPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Pointer and Touch events both fire for the same physical gesture (the
  // Touch path is a fallback for quick Apple Pencil taps that Safari drops
  // from the Pointer API). Whichever source fires first claims the gesture;
  // events from the other source are ignored until it ends, so a stroke is
  // never drawn twice.
  const activeInputSourceRef = useRef<"pointer" | "touch" | null>(null)

  // Performance profiling (only active when DEBUG_PERFORMANCE is true)
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef<number | null>(null)
  const performanceMetrics = useRef({
    drawStrokeTime: 0,
    totalMoveTime: 0,
    sampleCount: 0,
  })

  // Undo/redo history - capped stacks of per-layer ImageData snapshots
  const undoStackRef = useRef<HistoryEntry[]>([])
  const redoStackRef = useRef<HistoryEntry[]>([])

  // O(1) layer lookup by id, for restoring history snapshots
  const layerById = useMemo(() => {
    const map = new Map<number, DrawingLayer>()
    layers.forEach((layer) => map.set(layer.id, layer))
    return map
  }, [layers])

  // Capture the current pixels of the given layers (or all layers if omitted).
  const captureState = (layerIds?: Set<number>): HistoryEntry => {
    const state: HistoryEntry = new Map()
    layers.forEach((layer) => {
      if (layerIds && !layerIds.has(layer.id)) return
      state.set(
        layer.id,
        layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height)
      )
    })
    return state
  }

  // Restore a history snapshot - only the layers it contains are touched.
  const restoreState = (state: HistoryEntry) => {
    state.forEach((imageData, layerId) => {
      const layer = layerById.get(layerId)
      if (!layer) return
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      layer.ctx.putImageData(imageData, 0, 0)
    })
  }

  // Push to the undo stack, capping its size to bound memory use.
  const pushUndo = (entry: HistoryEntry) => {
    undoStackRef.current.push(entry)
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift()
    }
  }

  // Expose undo/redo methods via ref
  useImperativeHandle(ref, () => ({
    undo: () => {
      if (undoStackRef.current.length === 0) return

      // Pop the snapshot to restore, and save the current state of exactly the
      // layers it will change onto the redo stack.
      const stateToRestore = undoStackRef.current.pop()!
      const affected = new Set(stateToRestore.keys())
      redoStackRef.current.push(captureState(affected))
      if (redoStackRef.current.length > MAX_HISTORY) {
        redoStackRef.current.shift()
      }

      restoreState(stateToRestore)
      onHistoryChange?.()
    },
    redo: () => {
      if (redoStackRef.current.length === 0) return

      const stateToRestore = redoStackRef.current.pop()!
      const affected = new Set(stateToRestore.keys())
      pushUndo(captureState(affected))

      restoreState(stateToRestore)
      onHistoryChange?.()
    },
    canUndo: () => undoStackRef.current.length > 0,
    canRedo: () => redoStackRef.current.length > 0,
    clear: () => {
      // Clearing touches every layer, so snapshot all of them.
      pushUndo(captureState())
      redoStackRef.current = []

      // Clear all layers and restore the white mask background.
      layers.forEach((layer) => {
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
        // Restore the white mask pixels that define the drawable region.
        layer.ctx.putImageData(layer.mask, 0, 0)
      })

      onHistoryChange?.()
    },
    save: (outlineImage?: HTMLImageElement) => {
      if (layers.length === 0) return ""

      // Composite all bounding-box layers onto a full-size canvas.
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = lookupTable.width
      tempCanvas.height = lookupTable.height
      const tempCtx = tempCanvas.getContext("2d")

      if (!tempCtx) return ""

      // Each layer canvas is drawn at its bounding-box offset.
      layers.forEach((layer) => {
        tempCtx.drawImage(layer.canvas, layer.offsetX, layer.offsetY)
      })

      // If outline image is provided, draw it on top
      if (outlineImage) {
        tempCtx.drawImage(outlineImage, 0, 0, tempCanvas.width, tempCanvas.height)
      }

      // Convert to data URL (PNG format)
      return tempCanvas.toDataURL("image/png")
    },
  }))

  // Mount layer canvases into the DOM, positioned at their bounding boxes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear container by removing all child nodes using DOM methods
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }

    // Append each layer canvas, positioned/sized to its bounding box as a
    // percentage of the full image.
    layers.forEach((layer) => {
      const style = layer.canvas.style
      style.position = "absolute"
      style.left = `${(layer.offsetX / lookupTable.width) * 100}%`
      style.top = `${(layer.offsetY / lookupTable.height) * 100}%`
      style.width = `${(layer.width / lookupTable.width) * 100}%`
      style.height = `${(layer.height / lookupTable.height) * 100}%`
      style.pointerEvents = "none"
      container.appendChild(layer.canvas)
    })

    // Reset undo/redo stacks when the layer set changes (new image)
    undoStackRef.current = []
    redoStackRef.current = []

    // Cleanup: remove canvases when the component unmounts or layers change
    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
    }
  }, [layers, lookupTable])

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
          lastGlobalPositionRef.current = getCanvasCoordinates(
            containerRef.current,
            lookupTable.width,
            lookupTable.height,
            event
          )
        }
      }
    }

    // A pointer released outside the canvas never reaches the element's own
    // onPointerUp, which would leave the gesture's input source claimed
    // forever. Clear it on any gesture end, wherever on the page it happens.
    const handleGestureEnd = () => {
      activeInputSourceRef.current = null
    }

    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: false })
    window.addEventListener("pointerup", handleGestureEnd)
    window.addEventListener("pointercancel", handleGestureEnd)
    window.addEventListener("touchend", handleGestureEnd)
    window.addEventListener("touchcancel", handleGestureEnd)
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove)
      window.removeEventListener("pointerup", handleGestureEnd)
      window.removeEventListener("pointercancel", handleGestureEnd)
      window.removeEventListener("touchend", handleGestureEnd)
      window.removeEventListener("touchcancel", handleGestureEnd)
    }
  }, [layers, lookupTable])

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

  // Draw a single dot on a layer, in layer-local coordinates.
  const drawDotOnLayer = (layer: DrawingLayer, x: number, y: number) => {
    const color = isEraser ? "#FFFFFF" : fillColor
    drawStrokeWithClipping(layer.ctx, (ctx) => {
      ctx.fillStyle = color
      ctx.globalAlpha = 1.0

      if (brushType === "soft" && !isEraser) {
        ctx.shadowBlur = brushSize * 0.5
        ctx.shadowColor = color
      } else {
        ctx.shadowBlur = 0
      }

      ctx.beginPath()
      ctx.arc(x - layer.offsetX, y - layer.offsetY, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  // Draw a line segment on a layer, translating to layer-local coordinates.
  const drawSegmentOnLayer = (
    layer: DrawingLayer,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) => {
    drawStrokeWithClipping(layer.ctx, (ctx) => {
      applyBrushSettings(ctx)
      ctx.beginPath()
      ctx.moveTo(x0 - layer.offsetX, y0 - layer.offsetY)
      ctx.lineTo(x1 - layer.offsetX, y1 - layer.offsetY)
      ctx.stroke()
    })
  }

  // Cheap bounding-box reject so free-draw doesn't touch every layer per
  // segment - only layers the stroke could actually paint into.
  const segmentTouchesLayer = (
    layer: DrawingLayer,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) => {
    const pad = brushSize // generous padding for line width + soft-brush blur
    return (
      Math.min(x0, x1) - pad <= layer.offsetX + layer.width &&
      Math.max(x0, x1) + pad >= layer.offsetX &&
      Math.min(y0, y1) - pad <= layer.offsetY + layer.height &&
      Math.max(y0, y1) + pad >= layer.offsetY
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()

    const container = containerRef.current
    if (!container || layers.length === 0) return

    const coords = getCanvasCoordinates(
      container,
      lookupTable.width,
      lookupTable.height,
      event
    )

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

    // Capture undo state BEFORE starting to draw (only once per stroke session).
    // Region-locked strokes only ever touch one layer, so snapshot just that
    // layer; free drawing can touch many, so snapshot all of them.
    if (!hasStateCapturedRef.current) {
      const beforeState =
        stayWithinLines && targetLayer
          ? captureState(new Set([targetLayer.id]))
          : captureState()
      pushUndo(beforeState)
      redoStackRef.current = [] // Clear redo stack on new action
      hasStateCapturedRef.current = true
    }

    setIsDrawing(true)
    lastPointRef.current = coords

    // Draw initial dot immediately to ensure quick taps are always visible.
    // Use requestAnimationFrame to not block the event handler.
    const dotCoords = coords
    const dotLayer = targetLayer

    requestAnimationFrame(() => {
      if (stayWithinLines) {
        if (dotLayer) drawDotOnLayer(dotLayer, dotCoords.x, dotCoords.y)
      } else {
        // Free drawing: draw the dot on every layer it overlaps
        layers.forEach((layer) => {
          if (
            segmentTouchesLayer(
              layer,
              dotCoords.x,
              dotCoords.y,
              dotCoords.x,
              dotCoords.y
            )
          ) {
            drawDotOnLayer(layer, dotCoords.x, dotCoords.y)
          }
        })
      }
    })
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !isDrawing || layers.length === 0) return

    event.preventDefault()

    const moveStart = DEBUG_PERFORMANCE ? performance.now() : 0

    const coords = getCanvasCoordinates(
      container,
      lookupTable.width,
      lookupTable.height,
      event
    )
    const lastPoint = lastPointRef.current

    if (!lastPoint) {
      lastPointRef.current = coords
      return
    }

    if (stayWithinLines) {
      // Region-locked drawing with clipping (canvas updates automatically)
      const layer = activeLayerRef.current
      if (layer) {
        const drawStart = DEBUG_PERFORMANCE ? performance.now() : 0
        drawSegmentOnLayer(layer, lastPoint.x, lastPoint.y, coords.x, coords.y)
        if (DEBUG_PERFORMANCE) {
          performanceMetrics.current.drawStrokeTime += performance.now() - drawStart
        }
      }
    } else {
      // Free drawing: draw on every layer the segment overlaps
      const drawStart = DEBUG_PERFORMANCE ? performance.now() : 0
      layers.forEach((layer) => {
        if (segmentTouchesLayer(layer, lastPoint.x, lastPoint.y, coords.x, coords.y)) {
          drawSegmentOnLayer(layer, lastPoint.x, lastPoint.y, coords.x, coords.y)
        }
      })
      if (DEBUG_PERFORMANCE) {
        performanceMetrics.current.drawStrokeTime += performance.now() - drawStart
      }
    }

    // Performance tracking (only when DEBUG_PERFORMANCE is enabled)
    if (DEBUG_PERFORMANCE) {
      const moveEnd = performance.now()
      performanceMetrics.current.totalMoveTime += moveEnd - moveStart
      performanceMetrics.current.sampleCount++

      // Log FPS and metrics periodically
      frameCountRef.current++
      const now = Date.now()
      if (lastFpsTimeRef.current === null) {
        lastFpsTimeRef.current = now
      }
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
  }

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !isDrawing || layers.length === 0) {
      // Not drawing, just treat it as pointer up
      handlePointerUp()
      return
    }

    // Get exit coordinates
    const exitCoords = getCanvasCoordinates(
      container,
      lookupTable.width,
      lookupTable.height,
      event
    )
    const lastPoint = lastPointRef.current

    // Draw final stroke to exit point if we have a last point
    if (
      lastPoint &&
      (lastPoint.x !== exitCoords.x || lastPoint.y !== exitCoords.y)
    ) {
      if (stayWithinLines) {
        const layer = activeLayerRef.current
        if (layer) {
          drawSegmentOnLayer(
            layer,
            lastPoint.x,
            lastPoint.y,
            exitCoords.x,
            exitCoords.y
          )
        }
      } else {
        // Free drawing on every overlapping layer
        layers.forEach((layer) => {
          if (
            segmentTouchesLayer(
              layer,
              lastPoint.x,
              lastPoint.y,
              exitCoords.x,
              exitCoords.y
            )
          ) {
            drawSegmentOnLayer(
              layer,
              lastPoint.x,
              lastPoint.y,
              exitCoords.x,
              exitCoords.y
            )
          }
        })
      }
    }

    // Stop drawing but preserve the active layer for re-entry
    handlePointerUpPreserveLayer()
  }

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || layers.length === 0) return

    // Check if pointer button is still pressed (buttons === 1 means primary down)
    if (event.buttons !== 1) return

    const coords = getCanvasCoordinates(
      container,
      lookupTable.width,
      lookupTable.height,
      event
    )
    const globalPos = lastGlobalPositionRef.current

    if (stayWithinLines) {
      // Continue drawing on the same layer we started with - don't find a new
      // one, so the original drawing region is preserved across re-entry.
      const layer = activeLayerRef.current
      if (
        layer &&
        globalPos &&
        (globalPos.x !== coords.x || globalPos.y !== coords.y)
      ) {
        drawSegmentOnLayer(layer, globalPos.x, globalPos.y, coords.x, coords.y)
      }
    } else if (
      globalPos &&
      (globalPos.x !== coords.x || globalPos.y !== coords.y)
    ) {
      // Free drawing: draw on every overlapping layer
      layers.forEach((layer) => {
        if (segmentTouchesLayer(layer, globalPos.x, globalPos.y, coords.x, coords.y)) {
          drawSegmentOnLayer(layer, globalPos.x, globalPos.y, coords.x, coords.y)
        }
      })
    }

    // Resume drawing only if we have a layer to draw on
    if (activeLayerRef.current || !stayWithinLines) {
      setIsDrawing(true)
      lastPointRef.current = coords
    }
  }

  // --- Input source arbitration --------------------------------------------
  // The handlers above are the core drawing logic. The thin wrappers below are
  // what the DOM actually binds to: they enforce that a single gesture is
  // served by exactly one input source, so Pointer and Touch events firing
  // together for the same gesture never double-draw a stroke.

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeInputSourceRef.current === "touch") return
    activeInputSourceRef.current = "pointer"
    handlePointerDown(event)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeInputSourceRef.current === "touch") return
    handlePointerMove(event)
  }

  const onPointerEnd = () => {
    if (activeInputSourceRef.current === "touch") return
    activeInputSourceRef.current = null
    handlePointerUp()
  }

  const onPointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeInputSourceRef.current === "touch") return
    handlePointerLeave(event)
  }

  const onPointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeInputSourceRef.current === "touch") return
    handlePointerEnter(event)
  }

  // Touch is the fallback path for Safari's pointer event filtering. It builds
  // a synthetic pointer-like event and reuses the core handlers, but only when
  // Touch owns the gesture (and ignores extra fingers - see palm rejection in
  // TODO.md). Touch events keep firing even past the element bounds, so they
  // need no leave/enter equivalents.
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (activeInputSourceRef.current !== null) return
    if (event.touches.length === 0) return
    activeInputSourceRef.current = "touch"

    const touch = event.touches[0]
    handlePointerDown({
      preventDefault: () => event.preventDefault(),
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerType: "pen",
      pressure: 0.5,
      buttons: 1,
      isPrimary: true,
    } as React.PointerEvent<HTMLDivElement>)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (activeInputSourceRef.current === "pointer") return
    if (event.touches.length === 0) return

    const touch = event.touches[0]
    handlePointerMove({
      preventDefault: () => event.preventDefault(),
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerType: "pen",
      pressure: 0.5,
      buttons: 1,
    } as React.PointerEvent<HTMLDivElement>)
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (activeInputSourceRef.current === "pointer") return
    activeInputSourceRef.current = null
    event.preventDefault()
    handlePointerUp()
  }

  return (
    <>
      <div
        ref={containerRef}
        className="aspect-square relative"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerLeave}
        onPointerEnter={onPointerEnter}
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
