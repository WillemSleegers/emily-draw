"use client"

import { useState } from "react"
import ImageGallery from "@/components/ImageGallery"
import DrawingScreen from "@/components/DrawingScreen"
import LoadingScreen from "@/components/LoadingScreen"
import ErrorBoundary from "@/components/ErrorBoundary"
import { processImage, type ProcessedImageData } from "@/lib/processImage"

import circleImage from "@/assets/images/basic-shapes/circle.svg"
import circlesImage from "@/assets/images/basic-shapes/circles.svg"
import crossImage from "@/assets/images/basic-shapes/cross.svg"
import heartImage from "@/assets/images/basic-shapes/heart.svg"
import squareImage from "@/assets/images/basic-shapes/square.svg"
import starImage from "@/assets/images/basic-shapes/star.svg"
import triangleImage from "@/assets/images/basic-shapes/triangle.svg"

import eightiesThrowbackImage from "@/assets/images/coloring-bunny/80s-throwback.svg"
import acornShopImage from "@/assets/images/coloring-bunny/acorn-shop.svg"
import appleHarvestImage from "@/assets/images/coloring-bunny/apple-harvest.svg"
import autumnAnticsImage from "@/assets/images/coloring-bunny/autumn-antics.svg"
import bakeryCornerImage from "@/assets/images/coloring-bunny/bakery-corner.svg"
import bathroomCornerImage from "@/assets/images/coloring-bunny/bathroom-corner.svg"
import canoeDaysImage from "@/assets/images/coloring-bunny/canoe-days.svg"
import coffeeShopCornerImage from "@/assets/images/coloring-bunny/coffee-shop-corner.svg"
import coffeeTreehouseCornerImage from "@/assets/images/coloring-bunny/coffee-treehouse-corner.svg"
import cozyMagicalNightImage from "@/assets/images/coloring-bunny/cozy-magical-night.svg"
import cozySeafoodCornerImage from "@/assets/images/coloring-bunny/cozy-seafood-corner.svg"
import cuteBearReadingImage from "@/assets/images/coloring-bunny/cute-bear-reading.svg"
import cuteBurgerCornerImage from "@/assets/images/coloring-bunny/cute-burger-corner.svg"
import cuteCafeCornerImage from "@/assets/images/coloring-bunny/cute-cafe-corner.svg"
import cuteCupcakeCornerImage from "@/assets/images/coloring-bunny/cute-cupcake-corner.svg"
import cuteHatMakingCornerImage from "@/assets/images/coloring-bunny/cute-hat-making-corner.svg"
import cuteNoodleCornerImage from "@/assets/images/coloring-bunny/cute-noodle-corner.svg"
import easterEggFunImage from "@/assets/images/coloring-bunny/easter-egg-fun.svg"
import friendsRoastingMarshmellosImage from "@/assets/images/coloring-bunny/friends-roasting-marshmellows.svg"
import funfairRomanceImage from "@/assets/images/coloring-bunny/funfair-romance.svg"
import gardenSnoozeImage from "@/assets/images/coloring-bunny/garden-snooze.svg"
import gardeningSweetheartsImage from "@/assets/images/coloring-bunny/gardening-sweethearts.svg"
import homemadeLemonadeImage from "@/assets/images/coloring-bunny/homemade-lemonade.svg"
import honeyHarvestImage from "@/assets/images/coloring-bunny/honey-harvest.svg"
import hookLineAndSnuggleImage from "@/assets/images/coloring-bunny/hook-line-and-snuggle.svg"
import livingRoomSceneImage from "@/assets/images/coloring-bunny/living-room-scene.svg"
import meadowStrollSweetheartsImage from "@/assets/images/coloring-bunny/meadow-stroll-sweethearts.svg"
import naturalSpringImage from "@/assets/images/coloring-bunny/natural-spring.svg"
import nutmegsAutumnHideawayImage from "@/assets/images/coloring-bunny/nutmegs-autumn-hideaway.svg"
import pumpkinSoupStallImage from "@/assets/images/coloring-bunny/pumpkin-soup-stall.svg"
import pumpkinTreeHouseImage from "@/assets/images/coloring-bunny/pumpkin-tree-house.svg"
import readingNookImage from "@/assets/images/coloring-bunny/reading-nook.svg"
import rowManceOnThePondImage from "@/assets/images/coloring-bunny/row-mance-on-the-pond.svg"
import shellAndShineImage from "@/assets/images/coloring-bunny/shell-and-shine.svg"
import spookyCornerImage from "@/assets/images/coloring-bunny/spooky-corner.svg"
import springCleanImage from "@/assets/images/coloring-bunny/spring-clean.svg"
import springCleaningImage from "@/assets/images/coloring-bunny/spring-cleaning.svg"
import springtimeSchoolyardImage from "@/assets/images/coloring-bunny/springtime-schoolyard.svg"
import studyBreakSanctuaryImage from "@/assets/images/coloring-bunny/study-break-sanctuary.svg"
import swingIntoFallImage from "@/assets/images/coloring-bunny/swing-into-fall.svg"
import teaTimeCapybaraFriendsImage from "@/assets/images/coloring-bunny/tea-time-capybara-friends.svg"
import toyShopCornerImage from "@/assets/images/coloring-bunny/toy-shop-corner.svg"
import turtleSpaImage from "@/assets/images/coloring-bunny/turtle-spa.svg"
import woodlandPicnicPartyImage from "@/assets/images/coloring-bunny/woodland-picnic-party.svg"
import yarnCornerImage from "@/assets/images/coloring-bunny/yarn-corner.svg"

import bulbasaurImage from "@/assets/images/pokemon/bulbasaur.png"

const IMAGE_GROUPS = [
  {
    name: "Basic Shapes",
    images: [
      { id: 1, name: "Circle", src: circleImage },
      { id: 2, name: "Circles", src: circlesImage },
      { id: 3, name: "Cross", src: crossImage },
      { id: 4, name: "Heart", src: heartImage },
      { id: 5, name: "Square", src: squareImage },
      { id: 6, name: "Star", src: starImage },
      { id: 7, name: "Triangle", src: triangleImage },
    ],
  },
  {
    name: "Coloring Bunny",
    images: [
      { id: 18, name: "80s Throwback", src: eightiesThrowbackImage },
      { id: 19, name: "Acorn Shop", src: acornShopImage },
      { id: 20, name: "Apple Harvest", src: appleHarvestImage },
      { id: 21, name: "Autumn Antics", src: autumnAnticsImage },
      { id: 22, name: "Bakery Corner", src: bakeryCornerImage },
      { id: 23, name: "Bathroom Corner", src: bathroomCornerImage },
      { id: 24, name: "Canoe Days", src: canoeDaysImage },
      { id: 25, name: "Coffee Shop Corner", src: coffeeShopCornerImage },
      { id: 26, name: "Coffee Treehouse Corner", src: coffeeTreehouseCornerImage },
      { id: 27, name: "Cozy Magical Night", src: cozyMagicalNightImage },
      { id: 28, name: "Cozy Seafood Corner", src: cozySeafoodCornerImage },
      { id: 29, name: "Cute Bear Reading", src: cuteBearReadingImage },
      { id: 30, name: "Cute Burger Corner", src: cuteBurgerCornerImage },
      { id: 31, name: "Cute Cafe Corner", src: cuteCafeCornerImage },
      { id: 32, name: "Cute Cupcake Corner", src: cuteCupcakeCornerImage },
      { id: 33, name: "Cute Hat Making Corner", src: cuteHatMakingCornerImage },
      { id: 34, name: "Cute Noodle Corner", src: cuteNoodleCornerImage },
      { id: 35, name: "Easter Egg Fun", src: easterEggFunImage },
      { id: 36, name: "Friends Roasting Marshmellows", src: friendsRoastingMarshmellosImage },
      { id: 37, name: "Funfair Romance", src: funfairRomanceImage },
      { id: 38, name: "Garden Snooze", src: gardenSnoozeImage },
      { id: 39, name: "Gardening Sweethearts", src: gardeningSweetheartsImage },
      { id: 40, name: "Homemade Lemonade", src: homemadeLemonadeImage },
      { id: 41, name: "Honey Harvest", src: honeyHarvestImage },
      { id: 42, name: "Hook Line and Snuggle", src: hookLineAndSnuggleImage },
      { id: 43, name: "Living Room Scene", src: livingRoomSceneImage },
      { id: 44, name: "Meadow Stroll Sweethearts", src: meadowStrollSweetheartsImage },
      { id: 45, name: "Natural Spring", src: naturalSpringImage },
      { id: 46, name: "Nutmeg's Autumn Hideaway", src: nutmegsAutumnHideawayImage },
      { id: 47, name: "Pumpkin Soup Stall", src: pumpkinSoupStallImage },
      { id: 48, name: "Pumpkin Tree House", src: pumpkinTreeHouseImage },
      { id: 49, name: "Reading Nook", src: readingNookImage },
      { id: 50, name: "Row-mance on the Pond", src: rowManceOnThePondImage },
      { id: 51, name: "Shell and Shine", src: shellAndShineImage },
      { id: 52, name: "Spooky Corner", src: spookyCornerImage },
      { id: 53, name: "Spring Clean", src: springCleanImage },
      { id: 54, name: "Spring Cleaning", src: springCleaningImage },
      { id: 55, name: "Springtime Schoolyard", src: springtimeSchoolyardImage },
      { id: 56, name: "Study Break Sanctuary", src: studyBreakSanctuaryImage },
      { id: 57, name: "Swing into Fall", src: swingIntoFallImage },
      { id: 58, name: "Tea Time Capybara Friends", src: teaTimeCapybaraFriendsImage },
      { id: 59, name: "Toy Shop Corner", src: toyShopCornerImage },
      { id: 60, name: "Turtle Spa", src: turtleSpaImage },
      { id: 61, name: "Woodland Picnic Party", src: woodlandPicnicPartyImage },
      { id: 62, name: "Yarn Corner", src: yarnCornerImage },
    ],
  },
  {
    name: "Pokémon",
    images: [
      { id: 63, name: "Bulbasaur", src: bulbasaurImage },
    ],
  },
]

type ImageOption = (typeof IMAGE_GROUPS)[0]["images"][0]

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<ImageOption | null>(null)
  const [processedData, setProcessedData] = useState<ProcessedImageData | null>(
    null,
  )

  const handleImageSelect = async (image: ImageOption) => {
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
        <ErrorBoundary onReset={handleBack}>
          <DrawingScreen data={processedData} onBack={handleBack} />
        </ErrorBoundary>
      </div>
    )
  }

  // Show image gallery
  return (
    <div className="h-full overflow-hidden">
      <ImageGallery groups={IMAGE_GROUPS} onSelect={handleImageSelect} />
    </div>
  )
}
