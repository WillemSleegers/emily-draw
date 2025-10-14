"use client"

import { useState } from "react"
import ImageGallery from "@/components/ImageGallery"
import DrawingScreen from "@/components/DrawingScreen"
import LoadingScreen from "@/components/LoadingScreen"
import { processImage, type ProcessedImageData } from "@/lib/processImage"

import circleImage from "@/assets/images/circle.png"
import squareImage from "@/assets/images/square.png"
import triangleImage from "@/assets/images/triangle.png"

const IMAGES = [
  { id: 1, name: "Circle", src: circleImage },
  { id: 2, name: "Square", src: squareImage },
  { id: 3, name: "Triangle", src: triangleImage },
]

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<(typeof IMAGES)[0] | null>(
    null
  )
  const [processedData, setProcessedData] = useState<ProcessedImageData | null>(
    null
  )

  const handleImageSelect = async (image: (typeof IMAGES)[0]) => {
    setSelectedImage(image)
    try {
      const data = await processImage(image.src)
      setProcessedData(data)
    } catch (error) {
      console.error("Error processing image:", error)
      setSelectedImage(null)
    }
  }

  const handleBack = () => {
    setSelectedImage(null)
    setProcessedData(null)
  }

  // Show loading screen while processing
  if (selectedImage && !processedData) {
    return (
      <div className="h-full overflow-hidden">
        <LoadingScreen />
      </div>
    )
  }

  // Show drawing screen with processed data
  if (processedData) {
    return (
      <div className="h-full overflow-hidden">
        <DrawingScreen data={processedData} onBack={handleBack} />
      </div>
    )
  }

  // Show image gallery
  return (
    <div className="h-full overflow-hidden">
      <ImageGallery images={IMAGES} onSelect={handleImageSelect} />
    </div>
  )
}
