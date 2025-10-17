import Image, { StaticImageData } from "next/image"
import { Button } from "./ui/button"
import { PencilIcon } from "lucide-react"
import { APP_BACKGROUND_GRADIENT } from "@/lib/constants"

interface ImageOption {
  id: number
  name: string
  src: StaticImageData
}

interface ImageGalleryProps {
  images: ImageOption[]
  onSelect: (image: ImageOption) => void
}

export default function ImageGallery({ images, onSelect }: ImageGalleryProps) {
  return (
    <div className={`flex flex-col gap-8 p-8 h-full overflow-y-auto ${APP_BACKGROUND_GRADIENT}`}>
      {/* Header */}
      <div className="flex items-center justify-center gap-4">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
          Emily&apos;s
        </h1>
        <PencilIcon className="size-16 text-purple-500" />
      </div>

      {/* Image Grid */}
      <div className="flex flex-wrap gap-8 justify-center">
        {images.map((image) => (
          <Button
            key={image.id}
            variant={"outline"}
            onClick={() => onSelect(image)}
            className="size-auto border-4 border-purple-300 dark:border-purple-700 hover:border-pink-400 dark:hover:border-pink-600 hover:scale-105 transition-all shadow-lg hover:shadow-xl bg-white dark:bg-gray-800"
          >
            <Image src={image.src} alt={image.name} width={200} height={200} />
          </Button>
        ))}
      </div>
    </div>
  )
}
