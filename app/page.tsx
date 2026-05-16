"use client"

import { useState } from "react"
import ImageGallery from "@/components/ImageGallery"
import DrawingScreen from "@/components/DrawingScreen"
import LoadingScreen from "@/components/LoadingScreen"
import ErrorBoundary from "@/components/ErrorBoundary"
import { processImage, type ProcessedImageData } from "@/lib/processImage"

import atomImage from "@/assets/images/atom.png"
import balloonImage from "@/assets/images/balloon.png"
import brontosaurusImage from "@/assets/images/brontosaurus.png"
import candyImage from "@/assets/images/candy.png"
import candyCaneImage from "@/assets/images/candy-cane.png"
import circleImage from "@/assets/images/circle.png"
import elephantImage from "@/assets/images/elephant.png"
import emptyImage from "@/assets/images/empty.png"
import icecreamImage from "@/assets/images/icecream.png"
import pawImage from "@/assets/images/paw.png"
import puzzleImage from "@/assets/images/puzzle.png"
import seaweedImage from "@/assets/images/seaweed.png"
import snowflakeImage from "@/assets/images/snowflake.png"
import squareImage from "@/assets/images/square.png"
import starImage from "@/assets/images/star.png"
import sunImage from "@/assets/images/sun.png"
import triangleImage from "@/assets/images/triangle.png"
import cozyThanksgivingFun from "@/assets/images/cozy-thanksgiving-fun.png"
import eightiesThrowbackImage from "@/assets/images/80s-throwback.png"
import acornShopImage from "@/assets/images/acorn-shop.png"
import appleHarvestImage from "@/assets/images/apple-harvest.png"
import autumnAnticsImage from "@/assets/images/autumn-antics.png"
import bakeryCornerImage from "@/assets/images/bakery-corner.png"
import bathroomCornerImage from "@/assets/images/bathroom-corner.png"
import canoeDaysImage from "@/assets/images/canoe-days.png"
import coffeeShopCornerImage from "@/assets/images/coffee-shop-corner.png"
import coffeeTreehouseCornerImage from "@/assets/images/coffee-treehouse-corner.png"
import cozyMagicalNightImage from "@/assets/images/cozy-magical-night.png"
import cozySeafoodCornerImage from "@/assets/images/cozy-seafood-corner.png"
import cuteBearReadingImage from "@/assets/images/cute-bear-reading.png"
import cuteBurgerCornerImage from "@/assets/images/cute-burger-corner.png"
import cuteCafeCornerImage from "@/assets/images/cute-cafe-corner.png"
import cuteCupcakeCornerImage from "@/assets/images/cute-cupcake-corner.png"
import cuteHatMakingCornerImage from "@/assets/images/cute-hat-making-corner.png"
import cuteNoodleCornerImage from "@/assets/images/cute-noodle-corner.png"
import easterEggFunImage from "@/assets/images/easter-egg-fun.png"
import friendsRoastingMarshmellosImage from "@/assets/images/friends-roasting-marshmellows.png"
import funfairRomanceImage from "@/assets/images/funfair-romance.png"
import gardenSnoozeImage from "@/assets/images/garden-snooze.png"
import gardeningSweetheartsImage from "@/assets/images/gardening-sweethearts.png"
import homemadeLemonadeImage from "@/assets/images/homemade-lemonade.png"
import honeyHarvestImage from "@/assets/images/honey-harvest.png"
import hookLineAndSnuggleImage from "@/assets/images/hook-line-and-snuggle.png"
import livingRoomSceneImage from "@/assets/images/living-room-scene.png"
import meadowStrollSweetheartsImage from "@/assets/images/meadow-stroll-sweethearts.png"
import naturalSpringImage from "@/assets/images/natural-spring.png"
import nutmegsAutumnHideawayImage from "@/assets/images/nutmegs-autumn-hideaway.png"
import pumpkinSoupStallImage from "@/assets/images/pumpkin-soup-stall.png"
import pumpkinTreeHouseImage from "@/assets/images/pumpkin-tree-house.png"
import readingNookImage from "@/assets/images/reading-nook.png"
import rowManceOnThePondImage from "@/assets/images/row-mance-on-the-pond.png"
import shellAndShineImage from "@/assets/images/shell-and-shine.png"
import spookyCornerImage from "@/assets/images/spooky-corner.png"
import springCleanImage from "@/assets/images/spring-clean.png"
import springCleaningImage from "@/assets/images/spring-cleaning.png"
import springtimeSchoolyardImage from "@/assets/images/springtime-schoolyard.png"
import studyBreakSanctuaryImage from "@/assets/images/study-break-sanctuary.png"
import swingIntoFallImage from "@/assets/images/swing-into-fall.png"
import teaTimeCapybaraFriendsImage from "@/assets/images/tea-time-capybara-friends.png"
import toyShopCornerImage from "@/assets/images/toy-shop-corner.png"
import turtleSpaImage from "@/assets/images/turtle-spa.png"
import woodlandPicnicPartyImage from "@/assets/images/woodland-picnic-party.png"
import yarnCornerImage from "@/assets/images/yarn-corner.png"

const IMAGES = [
  { id: 0, name: "Empty", src: emptyImage },
  { id: 1, name: "Circle", src: circleImage },
  { id: 2, name: "Square", src: squareImage },
  { id: 3, name: "Triangle", src: triangleImage },
  { id: 4, name: "Star", src: starImage },
  { id: 5, name: "Balloon", src: balloonImage },
  { id: 6, name: "Ice Cream", src: icecreamImage },
  { id: 7, name: "Candy", src: candyImage },
  { id: 8, name: "Candy Cane", src: candyCaneImage },
  { id: 9, name: "Puzzle", src: puzzleImage },
  { id: 10, name: "Atom", src: atomImage },
  { id: 11, name: "Elephant", src: elephantImage },
  { id: 12, name: "Paw Print", src: pawImage },
  { id: 13, name: "Seaweed", src: seaweedImage },
  { id: 14, name: "Snowflake", src: snowflakeImage },
  { id: 15, name: "Sun", src: sunImage },
  { id: 16, name: "Brontosaurus", src: brontosaurusImage },
  { id: 17, name: "Cozy Thanksgiving Fun", src: cozyThanksgivingFun },
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
]

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<(typeof IMAGES)[0] | null>(
    null,
  )
  const [processedData, setProcessedData] = useState<ProcessedImageData | null>(
    null,
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
        <ErrorBoundary onReset={handleBack}>
          <DrawingScreen data={processedData} onBack={handleBack} />
        </ErrorBoundary>
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
