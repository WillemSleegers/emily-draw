/**
 * Saving the finished artwork.
 *
 * On iPadOS - the primary target - an `<a download>` pointing at a data: URL
 * does not download: Safari opens the PNG in a new tab and the child is stuck
 * on a page with no way back. The Web Share API does work there, and puts
 * "Save Image" (straight to Photos) in the share sheet, so it is tried first.
 *
 * `share()` needs the user activation from the button tap, which an awaited
 * `canvas.toBlob()` would spend. The blob is therefore built synchronously
 * from `toDataURL()` so the share call still happens inside the tap.
 */

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",")
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png"
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.download = filename
  link.href = url
  link.click()
  // Revoke on the next tick - immediately would cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function saveDrawing(canvas: HTMLCanvasElement): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
  const filename = `drawing-${stamp}.png`

  const blob = dataUrlToBlob(canvas.toDataURL("image/png"))
  const file = new File([blob], filename, { type: "image/png" })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (error) {
      // AbortError just means the child dismissed the sheet - don't then
      // surprise them with a download on top of it.
      if (error instanceof DOMException && error.name === "AbortError") return
    }
  }

  downloadBlob(blob, filename)
}
