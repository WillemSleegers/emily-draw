import { AlertCircleIcon, ArrowBigLeftIcon } from "lucide-react"
import { Button } from "./ui/button"
import { APP_BACKGROUND_GRADIENT } from "@/lib/constants"

/**
 * The "something went wrong" screen. Wordless on purpose - a three-year-old
 * can't read an error message, but they can tap a big back arrow.
 */
export default function ErrorScreen({ onReset }: { onReset: () => void }) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full w-full p-8 ${APP_BACKGROUND_GRADIENT}`}
    >
      <div className="flex flex-col items-center gap-12">
        <div className="size-48 flex items-center justify-center rounded-full bg-card border-4 border-destructive">
          <AlertCircleIcon className="size-32 text-destructive" />
        </div>

        <h1 className="text-6xl font-bold text-foreground">Oops!</h1>

        <Button
          onClick={onReset}
          aria-label="Back to pictures"
          className="size-32 rounded-xl border-4 border-border hover:border-primary bg-card"
          variant="outline"
        >
          <ArrowBigLeftIcon className="size-16" />
        </Button>
      </div>
    </div>
  )
}
