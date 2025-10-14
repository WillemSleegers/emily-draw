import Image, { StaticImageData } from "next/image"
import { Button } from "./ui/button"

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
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <h1 className="text-center text-6xl font-bold">Emily&apos;s Coloring Book</h1>

      {/* Image Grid */}
      <div className="flex flex-wrap gap-8 justify-center">
        {images.map((image) => (
          <Button
            key={image.id}
            variant={"outline"}
            onClick={() => onSelect(image)}
            className="size-auto"
          >
            <Image src={image.src} alt={image.name} width={200} height={200} />
          </Button>
        ))}
      </div>
    </div>
  )
}
