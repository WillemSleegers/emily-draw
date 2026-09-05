import Image, { StaticImageData } from "next/image"
import { Button } from "./ui/button"
import { PencilIcon } from "lucide-react"
import { APP_BACKGROUND_GRADIENT } from "@/lib/constants"

interface ImageOption {
  id: number
  name: string
  src: StaticImageData | string
}

interface ImageGroup {
  name: string
  images: ImageOption[]
}

interface ImageGalleryProps {
  groups: ImageGroup[]
  onSelect: (image: ImageOption) => void
}

export default function ImageGallery({ groups, onSelect }: ImageGalleryProps) {
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

      {/* Groups */}
      {groups.map((group) => (
        <div key={group.name} className="flex flex-col gap-4">
          <h2 className="text-3xl font-bold text-foreground/70">{group.name}</h2>
          <div className="flex flex-wrap gap-8 justify-center">
            {group.images.map((image, index) => (
              <Button
                key={image.id}
                variant={"outline"}
                onClick={() => onSelect(image)}
                aria-label={`Color ${image.name}`}
                className="size-auto h-auto p-2 border-4 border-brand-border hover:border-brand-accent-border hover:scale-105 transition-all shadow-lg hover:shadow-xl bg-card"
              >
                <Image src={image.src} alt={image.name} width={200} height={200} priority={index === 0} />
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
