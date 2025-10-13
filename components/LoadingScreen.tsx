import { Spinner } from "./ui/spinner"

export default function LoadingScreen() {
  return (
    <div className="h-dvh flex items-center justify-center">
      <Spinner className="size-36" />
    </div>
  )
}
