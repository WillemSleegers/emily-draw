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
    <div
      className={`flex flex-col gap-8 p-8 h-full overflow-y-auto ${APP_BACKGROUND_GRADIENT}`}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-4">
        <h1 className="text-6xl font-bold bg-linear-to-r from-brand-accent via-brand to-primary bg-clip-text text-transparent">
          Emily&apos;s
        </h1>
        <PencilIcon className="size-16 text-brand" />
      </div>

      {/* Image Grid */}
      <div className="flex flex-wrap gap-8 justify-center">
        {images.map((image) => (
          <Button
            key={image.id}
            variant={"outline"}
            onClick={() => onSelect(image)}
            className="size-auto h-auto p-2 border-4 border-brand-border hover:border-brand-accent-border hover:scale-105 transition-all shadow-lg hover:shadow-xl bg-card"
          >
            <Image src={image.src} alt={image.name} width={200} height={200} />
          </Button>
        ))}
      </div>
    </div>
  )
}
