"use client"

import { useState } from "react"
import ImageGallery from "@/components/ImageGallery"
import DrawingScreen from "@/components/DrawingScreen"
import LoadingScreen from "@/components/LoadingScreen"
import { processImage, type ProcessedImageData } from "@/lib/processImage"

import atomImage from "@/assets/images/atom.png"
import balloonImage from "@/assets/images/balloon.png"
import candyCaneImage from "@/assets/images/candy-cane.png"
import circleImage from "@/assets/images/circle.png"
import elephantImage from "@/assets/images/elephant.png"
import icecreamImage from "@/assets/images/icecream.png"
import pawImage from "@/assets/images/paw.png"
import puzzleImage from "@/assets/images/puzzle.png"
import seaweedImage from "@/assets/images/seaweed.png"
import snowflakeImage from "@/assets/images/snowflake.png"
import squareImage from "@/assets/images/square.png"
import starImage from "@/assets/images/star.png"
import sunImage from "@/assets/images/sun.png"
import triangleImage from "@/assets/images/triangle.png"

const IMAGES = [
  { id: 1, name: "Circle", src: circleImage },
  { id: 2, name: "Square", src: squareImage },
  { id: 3, name: "Triangle", src: triangleImage },
  { id: 4, name: "Star", src: starImage },
  { id: 5, name: "Balloon", src: balloonImage },
  { id: 6, name: "Ice Cream", src: icecreamImage },
  { id: 7, name: "Candy Cane", src: candyCaneImage },
  { id: 8, name: "Puzzle", src: puzzleImage },
  { id: 9, name: "Atom", src: atomImage },
  { id: 10, name: "Elephant", src: elephantImage },
  { id: 11, name: "Paw Print", src: pawImage },
  { id: 12, name: "Seaweed", src: seaweedImage },
  { id: 13, name: "Snowflake", src: snowflakeImage },
  { id: 14, name: "Sun", src: sunImage },
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
