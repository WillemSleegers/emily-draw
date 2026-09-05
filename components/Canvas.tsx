"use client"

import { useEffect, useRef, useState, useMemo, useImperativeHandle } from "react"
import { getCanvasCoordinates } from "@/lib/canvasUtils"
import {
  findLayerAtPoint,
  drawStrokeWithClipping,
  type DrawingLayer,
  type LayerLookupTable,
} from "@/lib/layerGeneration"
import type { BrushType } from "./BrushSettings"
import { ERASER_COLOR, MAX_HISTORY } from "@/lib/constants"

interface CanvasProps {
  layers: DrawingLayer[]
  lookupTable: LayerLookupTable
  fillColor: string
  brushSize: number
  brushType: BrushType
  isEraser: boolean
  stayWithinLines: boolean
  onHistoryChange?: () => void
  ref?: React.Ref<CanvasRef>
}

export interface CanvasRef {
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
  /** Composite every layer (and optionally the outline) onto a fresh canvas. */
  saveToCanvas: (outlineImage?: HTMLImageElement) => HTMLCanvasElement | null
}

// A history entry: the "before" pixels of every layer the stroke touched.
type HistoryEntry = Map<number, ImageData>

/**
 * The subset of a pointer/touch event the drawing logic needs.
 *
 * Pointer and Touch both feed the same handlers (Touch is a fallback for the
 * quick Apple Pencil taps Safari drops from the Pointer API), so they are
 * normalised to this instead of casting a hand-built object to a PointerEvent.
 */
interface DrawInput {
  clientX: number
  clientY: number
  buttons: number
  preventDefault: () => void
  /** Intermediate positions the browser batched into this event, oldest first. */
  coalesced?: readonly { clientX: number; clientY: number }[]
}

function fromPointer(event: React.PointerEvent<HTMLDivElement>): DrawInput {
  const native = event.nativeEvent
  // Apple Pencil samples at up to 240 Hz but delivers ~60 pointermove events;
  // the skipped samples are only reachable through getCoalescedEvents.
  const coalesced = native.getCoalescedEvents?.()
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    buttons: event.buttons,
    preventDefault: () => event.preventDefault(),
    coalesced: coalesced && coalesced.length > 1 ? coalesced : undefined,
  }
}

function fromTouch(event: React.TouchEvent<HTMLDivElement>, touch: React.Touch): DrawInput {
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    buttons: 1,
    preventDefault: () => event.preventDefault(),
  }
}

export default function Canvas({
  layers,
  lookupTable,
  fillColor,
  brushSize,
  brushType,
  isEraser,
  stayWithinLines,
  onHistoryChange,
  ref,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const activeLayerRef = useRef<DrawingLayer | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // Container bounds, cached for the duration of a stroke. Reading
  // getBoundingClientRect per pointermove forces a layout on every sample,
  // which at Pencil sample rates is a measurable cost.
  const rectRef = useRef<DOMRect | null>(null)

  // Global pointer position tracking (for edge gap fix)
  const lastGlobalPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Pointer and Touch events both fire for the same physical gesture.
  // Whichever source fires first claims the gesture; events from the other
  // source are ignored until it ends, so a stroke is never drawn twice.
  const activeInputSourceRef = useRef<"pointer" | "touch" | null>(null)

  // Undo/redo history - capped stacks of per-layer ImageData snapshots
  const undoStackRef = useRef<HistoryEntry[]>([])
  const redoStackRef = useRef<HistoryEntry[]>([])

  // The "before" pixels of the layers this stroke has touched so far. Built up
  // lazily as the stroke reaches each layer and pushed on stroke end, so a
  // free-draw stroke costs one snapshot per layer it actually paints into
  // rather than a snapshot of every layer in the image.
  const pendingUndoRef = useRef<HistoryEntry | null>(null)

  // O(1) layer lookup by id, for restoring history snapshots
  const layerById = useMemo(() => {
    const map = new Map<number, DrawingLayer>()
    layers.forEach((layer) => map.set(layer.id, layer))
    return map
  }, [layers])

  const snapshotLayer = (layer: DrawingLayer): ImageData =>
    layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height)

  // Capture the current pixels of every layer (used by clear()).
  const captureAllLayers = (): HistoryEntry =>
    new Map(layers.map((layer) => [layer.id, snapshotLayer(layer)]))

  // Restore a history snapshot - only the layers it contains are touched.
  const restoreState = (state: HistoryEntry) => {
    state.forEach((imageData, layerId) => {
      const layer = layerById.get(layerId)
      if (!layer) return
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      layer.ctx.putImageData(imageData, 0, 0)
    })
  }

  const pushCapped = (stack: HistoryEntry[], entry: HistoryEntry) => {
    stack.push(entry)
    if (stack.length > MAX_HISTORY) stack.shift()
  }

  // Record a layer's pre-stroke pixels the first time this stroke touches it.
  const rememberLayerForUndo = (layer: DrawingLayer) => {
    if (!pendingUndoRef.current) {
      pendingUndoRef.current = new Map()
      redoStackRef.current = [] // a new action invalidates the redo stack
    }
    if (!pendingUndoRef.current.has(layer.id)) {
      pendingUndoRef.current.set(layer.id, snapshotLayer(layer))
    }
  }

  // Commit whatever this stroke touched as one undo entry.
  const commitPendingUndo = (): boolean => {
    const pending = pendingUndoRef.current
    pendingUndoRef.current = null
    if (!pending || pending.size === 0) return false
    pushCapped(undoStackRef.current, pending)
    return true
  }

  /**
   * Move one step between the two history stacks: pop the snapshot to restore,
   * push the current pixels of exactly the layers it will change onto the
   * other stack, then restore. Undo and redo are the same operation with the
   * stacks swapped.
   */
  const stepHistory = (from: HistoryEntry[], to: HistoryEntry[]) => {
    const stateToRestore = from.pop()
    if (!stateToRestore) return

    const current: HistoryEntry = new Map()
    stateToRestore.forEach((_, layerId) => {
      const layer = layerById.get(layerId)
      if (layer) current.set(layerId, snapshotLayer(layer))
    })
    pushCapped(to, current)

    restoreState(stateToRestore)
    onHistoryChange?.()
  }

  useImperativeHandle(ref, () => ({
    undo: () => stepHistory(undoStackRef.current, redoStackRef.current),
    redo: () => stepHistory(redoStackRef.current, undoStackRef.current),
    canUndo: () => undoStackRef.current.length > 0,
    canRedo: () => redoStackRef.current.length > 0,
    clear: () => {
      // Clearing touches every layer, so snapshot all of them.
      pushCapped(undoStackRef.current, captureAllLayers())
      redoStackRef.current = []

      // Clear all layers and restore the white mask background.
      layers.forEach((layer) => {
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
        // Restore the white mask pixels that define the drawable region.
        layer.ctx.putImageData(layer.mask, 0, 0)
      })

      onHistoryChange?.()
    },
    saveToCanvas: (outlineImage?: HTMLImageElement) => {
      if (layers.length === 0) return null

      // Composite all bounding-box layers onto a full-size canvas.
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = lookupTable.width
      tempCanvas.height = lookupTable.height
      const tempCtx = tempCanvas.getContext("2d")
      if (!tempCtx) return null

      // Each layer canvas is drawn at its bounding-box offset.
      layers.forEach((layer) => {
        tempCtx.drawImage(layer.canvas, layer.offsetX, layer.offsetY)
      })

      // Draw the outline on top with multiply so a white background in the
      // source image doesn't paint over the artwork. Mirrors the
      // mix-blend-multiply applied to OutlineOverlay in the live view.
      if (outlineImage) {
        tempCtx.save()
        tempCtx.globalCompositeOperation = "multiply"
        tempCtx.drawImage(outlineImage, 0, 0, tempCanvas.width, tempCanvas.height)
        tempCtx.restore()
      }

      return tempCanvas
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
    pendingUndoRef.current = null

    // Cleanup: remove canvases when the component unmounts or layers change
    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild)
      }
    }
  }, [layers, lookupTable])

  // Container bounds are cached per stroke; anything that could move or resize
  // the canvas invalidates the cache.
  const getRect = (): DOMRect | null => {
    if (!rectRef.current && containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect()
    }
    return rectRef.current
  }

  useEffect(() => {
    const invalidate = () => {
      rectRef.current = null
    }
    window.addEventListener("resize", invalidate)
    window.addEventListener("orientationchange", invalidate)
    window.addEventListener("scroll", invalidate, true)
    return () => {
      window.removeEventListener("resize", invalidate)
      window.removeEventListener("orientationchange", invalidate)
      window.removeEventListener("scroll", invalidate, true)
    }
  }, [])

  const coordsFor = (input: { clientX: number; clientY: number }) => {
    const rect = getRect()
    if (!rect) return null
    return getCanvasCoordinates(rect, lookupTable.width, lookupTable.height, input)
  }

  // Apply brush settings to a context
  const applyBrushSettings = (ctx: CanvasRenderingContext2D) => {
    const color = isEraser ? ERASER_COLOR : fillColor

    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    // Apply shadow for soft brush (but not for eraser)
    if (brushType === "soft" && !isEraser) {
      ctx.shadowBlur = brushSize * 0.5
      ctx.shadowColor = color
    }
  }

  // Draw a single dot on a layer, in layer-local coordinates.
  const drawDotOnLayer = (layer: DrawingLayer, x: number, y: number) => {
    rememberLayerForUndo(layer)
    const color = isEraser ? ERASER_COLOR : fillColor
    drawStrokeWithClipping(layer.ctx, (ctx) => {
      ctx.fillStyle = color
      if (brushType === "soft" && !isEraser) {
        ctx.shadowBlur = brushSize * 0.5
        ctx.shadowColor = color
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
    rememberLayerForUndo(layer)
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

  /**
   * Paint one segment. In region-locked mode it goes to the layer the stroke
   * started on; in free mode, to every layer whose bounding box it crosses.
   */
  const paintSegment = (x0: number, y0: number, x1: number, y1: number) => {
    if (stayWithinLines) {
      const layer = activeLayerRef.current
      if (layer) drawSegmentOnLayer(layer, x0, y0, x1, y1)
      return
    }
    layers.forEach((layer) => {
      if (segmentTouchesLayer(layer, x0, y0, x1, y1)) {
        drawSegmentOnLayer(layer, x0, y0, x1, y1)
      }
    })
  }

  const paintDot = (x: number, y: number) => {
    if (stayWithinLines) {
      const layer = activeLayerRef.current
      if (layer) drawDotOnLayer(layer, x, y)
      return
    }
    layers.forEach((layer) => {
      if (segmentTouchesLayer(layer, x, y, x, y)) drawDotOnLayer(layer, x, y)
    })
  }

  const handleDown = (input: DrawInput) => {
    input.preventDefault()
    if (!containerRef.current || layers.length === 0) return

    rectRef.current = null // the canvas may have moved/resized since last stroke
    const coords = coordsFor(input)
    if (!coords) return

    if (stayWithinLines) {
      // Region-locked drawing: find the layer using O(1) lookup table
      const layer = findLayerAtPoint(layers, coords.x, coords.y, lookupTable)
      if (!layer) return
      activeLayerRef.current = layer
    } else {
      activeLayerRef.current = null
    }

    setIsDrawing(true)
    lastPointRef.current = coords

    // Draw the initial dot on the next frame so quick taps are always visible
    // without blocking the event handler.
    requestAnimationFrame(() => paintDot(coords.x, coords.y))
  }

  const handleMove = (input: DrawInput) => {
    if (!containerRef.current || !isDrawing || layers.length === 0) return
    input.preventDefault()

    const lastPoint = lastPointRef.current
    const coords = coordsFor(input)
    if (!coords) return

    if (!lastPoint) {
      lastPointRef.current = coords
      return
    }

    // Draw through the coalesced samples too, so fast strokes are curves
    // rather than the long straight chords a 60 Hz sampling would give.
    let from = lastPoint
    if (input.coalesced) {
      for (const sample of input.coalesced) {
        const point = coordsFor(sample)
        if (!point) continue
        if (point.x !== from.x || point.y !== from.y) {
          paintSegment(from.x, from.y, point.x, point.y)
          from = point
        }
      }
    }
    if (from.x !== coords.x || from.y !== coords.y) {
      paintSegment(from.x, from.y, coords.x, coords.y)
    }

    lastPointRef.current = coords
  }

  /**
   * End the gesture for good: commit the stroke's undo entry and drop all
   * per-stroke state. Idempotent, because the element handler and the
   * window-level fallback can both fire for the same release.
   */
  const endStroke = () => {
    const committed = commitPendingUndo()
    setIsDrawing(false)
    activeLayerRef.current = null
    lastPointRef.current = null
    lastGlobalPositionRef.current = null
    rectRef.current = null
    if (committed) onHistoryChange?.()
  }

  /**
   * The pointer left the canvas but the button is still down. Pause drawing
   * without committing, so re-entry continues the same stroke and the same
   * region.
   */
  const pauseStroke = () => {
    setIsDrawing(false)
    lastPointRef.current = null
    lastGlobalPositionRef.current = null
  }

  const handleLeave = (input: DrawInput) => {
    if (!containerRef.current || !isDrawing || layers.length === 0) {
      endStroke()
      return
    }

    const exitCoords = coordsFor(input)
    const lastPoint = lastPointRef.current

    // Draw the final stroke out to the exit point so the line reaches the edge.
    if (
      exitCoords &&
      lastPoint &&
      (lastPoint.x !== exitCoords.x || lastPoint.y !== exitCoords.y)
    ) {
      paintSegment(lastPoint.x, lastPoint.y, exitCoords.x, exitCoords.y)
    }

    pauseStroke()
  }

  const handleEnter = (input: DrawInput) => {
    if (!containerRef.current || layers.length === 0) return

    // Only resume if the button is still held down.
    if (input.buttons !== 1) return

    // In region-locked mode the stroke must have started inside the canvas -
    // otherwise there is no region to continue into.
    if (stayWithinLines && !activeLayerRef.current) return

    const coords = coordsFor(input)
    if (!coords) return
    const globalPos = lastGlobalPositionRef.current

    // Bridge the gap between where the pointer was last seen off-canvas and
    // where it re-entered.
    if (globalPos && (globalPos.x !== coords.x || globalPos.y !== coords.y)) {
      paintSegment(globalPos.x, globalPos.y, coords.x, coords.y)
    }

    setIsDrawing(true)
    lastPointRef.current = coords
  }

  // Track global pointer position to fix edge gaps on fast entry, and end the
  // gesture even when the pointer is released off-canvas (where the element's
  // own up/end handlers never fire).
  useEffect(() => {
    const handleGlobalPointerMove = (event: PointerEvent) => {
      if (layers.length === 0 || !containerRef.current) return
      if (event.buttons !== 1) return

      // Only track position while the pointer is over the canvas.
      const rect = getRect()
      if (!rect) return
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        lastGlobalPositionRef.current = getCanvasCoordinates(
          rect,
          lookupTable.width,
          lookupTable.height,
          event
        )
      }
    }

    // Only the source that owns the gesture may end it - a stray pointerup
    // during a Touch-owned Pencil stroke must not cut the stroke short.
    const handlePointerEnd = () => {
      if (activeInputSourceRef.current === "touch") return
      activeInputSourceRef.current = null
      endStroke()
    }

    const handleTouchGestureEnd = (event: TouchEvent) => {
      if (activeInputSourceRef.current === "pointer") return
      if (event.touches.length > 0) return // other fingers still down
      activeInputSourceRef.current = null
      endStroke()
    }

    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerEnd)
    window.addEventListener("pointercancel", handlePointerEnd)
    window.addEventListener("touchend", handleTouchGestureEnd)
    window.addEventListener("touchcancel", handleTouchGestureEnd)
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove)
      window.removeEventListener("pointerup", handlePointerEnd)
      window.removeEventListener("pointercancel", handlePointerEnd)
      window.removeEventListener("touchend", handleTouchGestureEnd)
      window.removeEventListener("touchcancel", handleTouchGestureEnd)
    }
  })

  // --- Input source arbitration --------------------------------------------
  // A single gesture is served by exactly one input source, so Pointer and
  // Touch firing together never double-draw a stroke. Touch events keep firing
  // past the element bounds, so they need no leave/enter equivalents.

  const pointerOwned = () => activeInputSourceRef.current !== "touch"

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (!pointerOwned()) return
        activeInputSourceRef.current = "pointer"
        handleDown(fromPointer(e))
      }}
      onPointerMove={(e) => pointerOwned() && handleMove(fromPointer(e))}
      onPointerLeave={(e) => pointerOwned() && handleLeave(fromPointer(e))}
      onPointerEnter={(e) => pointerOwned() && handleEnter(fromPointer(e))}
      onTouchStart={(e) => {
        if (activeInputSourceRef.current !== null) return
        const touch = e.touches[0]
        if (!touch) return
        activeInputSourceRef.current = "touch"
        handleDown(fromTouch(e, touch))
      }}
      onTouchMove={(e) => {
        if (activeInputSourceRef.current === "pointer") return
        const touch = e.touches[0]
        if (touch) handleMove(fromTouch(e, touch))
      }}
    >
      {/* Layer canvases are mounted here via useEffect */}
    </div>
  )
}
