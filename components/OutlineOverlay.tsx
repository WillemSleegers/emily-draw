"use client"

import { useEffect, useRef } from "react"

interface OutlineOverlayProps {
  outlineImage: HTMLImageElement
  width: number
  height: number
}

export default function OutlineOverlay({
  outlineImage,
  width,
  height,
}: OutlineOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return

    // Draw scaled to canvas size so SVGs fill correctly
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(outlineImage, 0, 0, width, height)
  }, [outlineImage, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 w-full h-full pointer-events-none mix-blend-multiply"
    />
  )
}
