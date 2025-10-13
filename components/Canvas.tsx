"use client"

import { useEffect, useRef, useState } from "react"
import { getCanvasCoordinates } from "@/lib/canvasUtils"
import {
  getRegionAt,
  getRegionAtWithTolerance,
  type RegionMap,
} from "@/lib/regionDetection"

interface CanvasProps {
  regionMap: RegionMap | null
  size: number
  fillColor: string
}

export default function Canvas({ regionMap, size, fillColor }: CanvasProps) {
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
        lastPointRef.current = coords
      }
      return
    }

    const dx = coords.x - lastPointRef.current.x
    const dy = coords.y - lastPointRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Quick path for short distances
    if (distance < 10) {
      const endRegionId = getRegionAtWithTolerance(
        regionMap,
        coords.x,
        coords.y,
        lockedRegionId,
        4
      )
      if (endRegionId === lockedRegionId) {
        ctx.strokeStyle = fillColor
        ctx.lineWidth = 20
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        ctx.beginPath()
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
        ctx.lineTo(coords.x, coords.y)
        ctx.stroke()

        lastPointRef.current = coords
      }
      return
    }

    // For longer distances, sample points along the path
    const steps = Math.max(Math.ceil(distance / 8), 1)
    const segments: Array<{
      start: { x: number; y: number }
      end: { x: number; y: number }
    }> = []
    let segmentStart: { x: number; y: number } | null = lastPointRef.current

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = lastPointRef.current.x + dx * t
      const y = lastPointRef.current.y + dy * t

      const pointRegionId = getRegionAtWithTolerance(
        regionMap,
        x,
        y,
        lockedRegionId,
        4
      )
      const isInRegion = pointRegionId === lockedRegionId

      if (isInRegion) {
        if (!segmentStart) {
          segmentStart = { x, y }
        }
      } else {
        if (segmentStart) {
          const prevT = Math.max(0, (i - 1) / steps)
          const prevX = lastPointRef.current.x + dx * prevT
          const prevY = lastPointRef.current.y + dy * prevT
          segments.push({ start: segmentStart, end: { x: prevX, y: prevY } })
          segmentStart = null
        }
      }
    }

    // Close final segment if we're still in region at the end
    if (segmentStart) {
      segments.push({ start: segmentStart, end: coords })
    }

    // Draw all valid segments
    if (segments.length > 0) {
      ctx.strokeStyle = fillColor
      ctx.lineWidth = 20
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      for (const segment of segments) {
        ctx.beginPath()
        ctx.moveTo(segment.start.x, segment.start.y)
        ctx.lineTo(segment.end.x, segment.end.y)
        ctx.stroke()
      }
    }

    // Update last point
    const finalRegionId = getRegionAtWithTolerance(
      regionMap,
      coords.x,
      coords.y,
      lockedRegionId,
      4
    )
    if (finalRegionId === lockedRegionId) {
      lastPointRef.current = coords
    } else {
      lastPointRef.current = null
    }
  }

  const handlePointerUp = () => {
    setIsDrawing(false)
    setLockedRegionId(null)
    lastPointRef.current = null
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-full"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  )
}
