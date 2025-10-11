"use client";

import { useState } from "react";
import type { RegionMap } from "@/lib/regionDetection";
import { getRegionStats } from "@/lib/regionDetection";

interface DebugOverlayProps {
  regionMap: RegionMap | null;
  currentRegionId: number | null;
  isProcessing: boolean;
}

export default function DebugOverlay({
  regionMap,
  currentRegionId,
  isProcessing,
}: DebugOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isProcessing) {
    return (
      <div className="fixed top-4 right-4 bg-yellow-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          <span>Processing regions...</span>
        </div>
      </div>
    );
  }

  if (!regionMap) {
    return null;
  }

  const stats = getRegionStats(regionMap);
  const currentRegion =
    currentRegionId && currentRegionId > 0
      ? regionMap.regions.find((r) => r.id === currentRegionId)
      : null;

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-blue-600 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-semibold">Region Debug</span>
        </div>
        <button className="text-white hover:text-gray-200">
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3 text-sm">
          {/* Region Statistics */}
          <div>
            <h3 className="font-semibold text-blue-300 mb-2">Statistics</h3>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Regions:</span>
                <span className="text-white font-bold">
                  {stats.totalRegions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Canvas Size:</span>
                <span className="text-white">
                  {regionMap.width} × {regionMap.height}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Boundary Pixels:</span>
                <span className="text-white">
                  {stats.boundaryPixels.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Assigned Pixels:</span>
                <span className="text-white">
                  {stats.assignedPixels.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Region Size:</span>
                <span className="text-white">
                  {stats.averageRegionSize.toLocaleString()} px
                </span>
              </div>
            </div>
          </div>

          {/* Current Region Info */}
          <div className="border-t border-gray-700 pt-3">
            <h3 className="font-semibold text-green-300 mb-2">
              Current Region
            </h3>
            {currentRegion ? (
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Region ID:</span>
                  <span className="text-white font-bold">
                    #{currentRegion.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Area:</span>
                  <span className="text-white">
                    {currentRegion.area.toLocaleString()} px
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bounds:</span>
                  <span className="text-white">
                    ({currentRegion.boundingBox.minX},{" "}
                    {currentRegion.boundingBox.minY}) → (
                    {currentRegion.boundingBox.maxX},{" "}
                    {currentRegion.boundingBox.maxY})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Avg Color:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-600"
                      style={{
                        backgroundColor: `rgb(${currentRegion.averageColor.r}, ${currentRegion.averageColor.g}, ${currentRegion.averageColor.b})`,
                      }}
                    />
                    <span className="text-white text-[10px]">
                      RGB({currentRegion.averageColor.r},{" "}
                      {currentRegion.averageColor.g},{" "}
                      {currentRegion.averageColor.b})
                    </span>
                  </div>
                </div>
              </div>
            ) : currentRegionId === -1 ? (
              <div className="text-yellow-400 text-xs">
                Hovering over boundary
              </div>
            ) : (
              <div className="text-gray-400 text-xs">
                Hover over canvas to see region info
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="border-t border-gray-700 pt-3">
            <h3 className="font-semibold text-purple-300 mb-2">Legend</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-gray-400">Clickable regions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-black rounded border border-gray-600" />
                <span className="text-gray-400">Boundary lines</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
