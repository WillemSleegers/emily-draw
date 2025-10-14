"use client"

import { useEffect, useRef, useState } from "react"
import { getCanvasCoordinates } from "@/lib/canvasUtils"
import {
  getRegionAt,
  getRegionAtWithTolerance,
  type RegionMap,
} from "@/lib/regionDetection"
import type { BrushType } from "./BrushSettings"

interface CanvasProps {
  regionMap: RegionMap | null
  size: number
  fillColor: string
  brushSize: number
  brushType: BrushType
}

export default function Canvas({ regionMap, size, fillColor, brushSize, brushType }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [lockedRegionId, setLockedRegionId] = useState<number | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas to fixed dimensions
    canvas.width = size
    canvas.height = size
  }, [size])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas || !regionMap) return

    const coords = getCanvasCoordinates(canvas, event)
    const regionId = getRegionAt(regionMap, coords.x, coords.y)

    if (regionId <= 0) return

    setIsDrawing(true)
    setLockedRegionId(regionId)
    lastPointRef.current = coords
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !regionMap || !isDrawing || lockedRegionId === null) return

    event.preventDefault()
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const coords = getCanvasCoordinates(canvas, event)

    if (!lastPointRef.current) {
      const regionIdWithTolerance = getRegionAtWithTolerance(
        regionMap,
        coords.x,
        coords.y,
        lockedRegionId,
        4
      )
      if (regionIdWithTolerance === lockedRegionId) {
        // Re-entering the region - set position and continue (don't return)
        // This ensures we start drawing from here in this frame
        lastPointRef.current = coords
        return
      }
      return
    }

    // TypeScript safety check (should never happen due to check above)
    const basePoint = lastPointRef.current
    if (!basePoint) return

    const dx = coords.x - basePoint.x
    const dy = coords.y - basePoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Sample points along the path with very fine granularity to avoid gaps
    const steps = Math.max(Math.ceil(distance / 2), 1)
    const points: Array<{ x: number; y: number; t: number; inRegion: boolean }> = []

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = basePoint.x + dx * t
      const y = basePoint.y + dy * t

      const pointRegionId = getRegionAtWithTolerance(
        regionMap,
        x,
        y,
        lockedRegionId,
        4
      )
      const inRegion = pointRegionId === lockedRegionId
      points.push({ x, y, t, inRegion })
    }

    // Helper function to find boundary crossing point between two sampled points
    const findBoundaryCrossing = (p1: typeof points[0], p2: typeof points[0]) => {
      // Binary search for more precise boundary location
      let t1 = p1.t
      let t2 = p2.t

      for (let i = 0; i < 8; i++) {
        const tMid = (t1 + t2) / 2
        const xMid = basePoint.x + dx * tMid
        const yMid = basePoint.y + dy * tMid

        const midRegionId = getRegionAtWithTolerance(regionMap, xMid, yMid, lockedRegionId, 4)
        const midInRegion = midRegionId === lockedRegionId

        if (midInRegion === p1.inRegion) {
          t1 = tMid
        } else {
          t2 = tMid
        }
      }

      const tBoundary = (t1 + t2) / 2
      return {
        x: basePoint.x + dx * tBoundary,
        y: basePoint.y + dy * tBoundary
      }
    }

    // Helper function to apply brush settings
    const applyBrushSettings = (ctx: CanvasRenderingContext2D) => {
      // Reset context state first
      ctx.globalAlpha = 1.0
      ctx.shadowBlur = 0
      ctx.shadowColor = "transparent"
      ctx.globalCompositeOperation = "source-over"

      ctx.strokeStyle = fillColor
      ctx.lineWidth = brushSize
      ctx.lineJoin = "round"
      ctx.lineCap = "round"

      // Apply brush-specific settings
      if (brushType === "soft") {
        // Soft brush with blur effect
        ctx.shadowBlur = brushSize * 0.5
        ctx.shadowColor = fillColor
      } else {
        // Solid brush
        ctx.globalAlpha = 1.0
        ctx.shadowBlur = 0
      }
    }

    // Find continuous segments and draw them
    let segmentStart: { x: number; y: number } | null = null
    let segmentPoints: { x: number; y: number }[] = []

    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      const prevPoint = i > 0 ? points[i - 1] : null

      if (point.inRegion) {
        if (!segmentStart) {
          // Starting a new segment
          if (prevPoint && !prevPoint.inRegion) {
            // We crossed FROM invalid TO valid - find exact crossing point
            const crossingPoint = findBoundaryCrossing(prevPoint, point)
            segmentStart = crossingPoint
            segmentPoints = [crossingPoint]
          } else {
            segmentStart = { x: point.x, y: point.y }
            segmentPoints = [segmentStart]
          }
        }
        // Add this point to the current segment
        segmentPoints.push({ x: point.x, y: point.y })
      } else {
        if (segmentStart && prevPoint && prevPoint.inRegion) {
          // We crossed FROM valid TO invalid - find exact crossing and draw
          const crossingPoint = findBoundaryCrossing(prevPoint, point)
          segmentPoints.push(crossingPoint)

          // Draw the segment with all collected points
          if (segmentPoints.length >= 2) {
            applyBrushSettings(ctx)
            ctx.beginPath()
            ctx.moveTo(segmentPoints[0].x, segmentPoints[0].y)
            for (let j = 1; j < segmentPoints.length; j++) {
              ctx.lineTo(segmentPoints[j].x, segmentPoints[j].y)
            }
            ctx.stroke()
          }

          segmentStart = null
          segmentPoints = []
        }
      }
    }

    // Draw final segment if we ended in the region
    const lastPoint = points[points.length - 1]
    if (segmentStart && lastPoint.inRegion && segmentPoints.length >= 2) {
      applyBrushSettings(ctx)
      ctx.beginPath()
      ctx.moveTo(segmentPoints[0].x, segmentPoints[0].y)
      for (let j = 1; j < segmentPoints.length; j++) {
        ctx.lineTo(segmentPoints[j].x, segmentPoints[j].y)
      }
      ctx.stroke()
    }

    // Always update lastPointRef to current position
    // This ensures we can calculate crossing points when re-entering from invalid regions
    lastPointRef.current = coords
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    setLockedRegionId(null)
    lastPointRef.current = null
  }

  const handlePointerEnter = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !regionMap) return

    // Check if pointer button is still pressed (buttons === 1 means primary button down)
    if (event.buttons === 1) {
      const coords = getCanvasCoordinates(canvas, event)
      const regionId = getRegionAt(regionMap, coords.x, coords.y)

      if (regionId <= 0) return

      // Resume drawing in this region
      setIsDrawing(true)
      setLockedRegionId(regionId)
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
