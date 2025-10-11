"use client";

import { useEffect, useRef, useState } from "react";
import { scanlineFill } from "@/lib/floodFill";
import { getCanvasCoordinates, hexToRgb } from "@/lib/canvasUtils";
import { detectRegions, getRegionAt, getRegionAtWithTolerance, type RegionMap } from "@/lib/regionDetection";
import { loadImageData } from "@/lib/imageLoader";
import DebugOverlay from "./DebugOverlay";

interface CanvasProps {
  imageSrc: any; // StaticImageData or string
}

export default function Canvas({ imageSrc }: CanvasProps) {
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const outlineCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [fillColor] = useState("#00ff00"); // Green for testing
  const [regionMap, setRegionMap] = useState<RegionMap | null>(null);
  const [isProcessingRegions, setIsProcessingRegions] = useState(false);
  const [hoveredRegionId, setHoveredRegionId] = useState<number | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [lockedRegionId, setLockedRegionId] = useState<number | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const drawingCanvas = drawingCanvasRef.current;
    const outlineCanvas = outlineCanvasRef.current;
    if (!drawingCanvas || !outlineCanvas) return;

    const outlineCtx = outlineCanvas.getContext("2d");
    if (!outlineCtx) return;

    // Step 1: Load image data (separate from rendering)
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setIsProcessingRegions(true);

        // Get the actual src URL from the imported image
        const imgUrl = typeof imageSrc === 'string' ? imageSrc : imageSrc.src;

        // Load image data with white background for region detection
        const imageData = await loadImageData(imgUrl);
        imageDataRef.current = imageData;

        // Step 2: Set canvas dimensions
        const width = imageData.width;
        const height = imageData.height;
        console.log('Image dimensions:', width, height);
        setDimensions({ width, height });

        // Set both canvas sizes
        drawingCanvas.width = width;
        drawingCanvas.height = height;
        outlineCanvas.width = width;
        outlineCanvas.height = height;

        // Step 3: Render outline to top canvas (load raw image without white background)
        const img = new Image();
        img.onload = () => {
          console.log('Image natural size:', img.naturalWidth, img.naturalHeight);
          console.log('Canvas size:', outlineCanvas.width, outlineCanvas.height);
          outlineCtx.drawImage(img, 0, 0);
        };
        img.src = imgUrl;

        setIsLoading(false);

        // Step 4: Detect regions from the raw image data
        const regions = detectRegions(imageData, 128, 100);
        setRegionMap(regions);

        setIsProcessingRegions(false);
      } catch (error) {
        console.error("Error loading image:", error);
        setIsLoading(false);
        setIsProcessingRegions(false);
      }
    };

    loadImage();
  }, [imageSrc]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const drawingCanvas = drawingCanvasRef.current;
    const outlineCanvas = outlineCanvasRef.current;
    if (!drawingCanvas || !outlineCanvas || !regionMap) return;

    const coords = getCanvasCoordinates(outlineCanvas, event as any);
    const regionId = getRegionAt(regionMap, coords.x, coords.y);

    // Don't start drawing on boundaries or unassigned pixels
    if (regionId <= 0) return;

    // Lock to this region and start drawing
    setIsDrawing(true);
    setLockedRegionId(regionId);
    lastPointRef.current = coords;

    console.log(`Started drawing in region ${regionId}`);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drawingCanvas = drawingCanvasRef.current;
    const outlineCanvas = outlineCanvasRef.current;
    if (!drawingCanvas || !outlineCanvas || !regionMap) return;

    const coords = getCanvasCoordinates(outlineCanvas, event as any);
    const regionId = getRegionAt(regionMap, coords.x, coords.y);

    // Update hovered region for debug overlay
    setHoveredRegionId(regionId);

    // If not drawing, just update hover state
    if (!isDrawing || lockedRegionId === null) return;

    const ctx = drawingCanvas.getContext("2d");
    if (!ctx) return;

    // If we don't have a last point (just started or re-entered region), start fresh
    if (!lastPointRef.current) {
      // Check if current position is in locked region
      const regionIdWithTolerance = getRegionAtWithTolerance(regionMap, coords.x, coords.y, lockedRegionId, 4);
      if (regionIdWithTolerance === lockedRegionId) {
        lastPointRef.current = coords;
      }
      return;
    }

    // Interpolate along the path to find valid segments
    const dx = coords.x - lastPointRef.current.x;
    const dy = coords.y - lastPointRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Quick path: if distance is small and end point is valid, just draw
    if (distance < 10) {
      const endRegionId = getRegionAtWithTolerance(regionMap, coords.x, coords.y, lockedRegionId, 4);
      if (endRegionId === lockedRegionId) {
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        lastPointRef.current = coords;
        return;
      }
    }

    // Slower path: sample and segment for longer distances
    // Sample points along the path (every ~8 pixels for better performance)
    const steps = Math.max(Math.ceil(distance / 8), 1);
    const segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = [];
    let segmentStart: { x: number; y: number } | null = lastPointRef.current;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lastPointRef.current.x + dx * t;
      const y = lastPointRef.current.y + dy * t;

      const pointRegionId = getRegionAtWithTolerance(regionMap, x, y, lockedRegionId, 4);
      const isInRegion = pointRegionId === lockedRegionId;

      if (isInRegion) {
        if (!segmentStart) {
          // Starting a new segment
          segmentStart = { x, y };
        }
      } else {
        if (segmentStart) {
          // Ending current segment
          const prevT = Math.max(0, (i - 1) / steps);
          const prevX = lastPointRef.current.x + dx * prevT;
          const prevY = lastPointRef.current.y + dy * prevT;
          segments.push({ start: segmentStart, end: { x: prevX, y: prevY } });
          segmentStart = null;
        }
      }
    }

    // Close final segment if we're still in region at the end
    if (segmentStart) {
      segments.push({ start: segmentStart, end: coords });
    }

    // Draw all valid segments
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const segment of segments) {
      ctx.beginPath();
      ctx.moveTo(segment.start.x, segment.start.y);
      ctx.lineTo(segment.end.x, segment.end.y);
      ctx.stroke();
    }

    // Update last point
    const finalRegionId = getRegionAtWithTolerance(regionMap, coords.x, coords.y, lockedRegionId, 4);
    if (finalRegionId === lockedRegionId) {
      lastPointRef.current = coords;
    } else {
      lastPointRef.current = null;
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    setLockedRegionId(null);
    lastPointRef.current = null;
    console.log("Stopped drawing");
  };

  const handlePointerLeave = () => {
    setHoveredRegionId(null);
    // Also stop drawing if pointer leaves canvas
    if (isDrawing) {
      handlePointerUp();
    }
  };


  return (
    <>
      <DebugOverlay
        regionMap={regionMap}
        currentRegionId={hoveredRegionId}
        isProcessing={isProcessingRegions}
      />
      <div className="flex flex-col items-center gap-4">
        {isLoading && (
          <div className="text-muted-foreground">Loading image...</div>
        )}
        <div
          ref={containerRef}
          className="relative border border-border rounded-lg shadow-lg cursor-crosshair inline-block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{ touchAction: "none" }}
        >
          {/* Drawing layer (bottom) */}
          <canvas
            ref={drawingCanvasRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{
              display: "block",
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
            }}
          />
          {/* Outline layer (top) */}
          <canvas
            ref={outlineCanvasRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
            }}
          />
        </div>
        {dimensions.width > 0 && (
          <div className="text-sm text-muted-foreground">
            Canvas size: {dimensions.width} × {dimensions.height}
            {regionMap && ` | ${regionMap.regions.length} regions detected`}
            {isDrawing && lockedRegionId && ` | Drawing in region ${lockedRegionId}`}
          </div>
        )}
      </div>
    </>
  );
}
