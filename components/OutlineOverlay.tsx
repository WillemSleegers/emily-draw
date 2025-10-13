"use client"

import { useEffect, useRef } from "react"

interface OutlineOverlayProps {
  outlineImage: HTMLImageElement
  size: number
}

export default function OutlineOverlay({
  outlineImage,
  size,
}: OutlineOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw the outline image directly (images already have transparent backgrounds)
    ctx.drawImage(outlineImage, 0, 0)
  }, [outlineImage, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  )
}
