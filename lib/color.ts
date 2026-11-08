/** Hue in degrees [0, 360); saturation and lightness in [0, 1]. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const value = parseInt(hex.replace("#", ""), 16)
  const r = ((value >> 16) & 0xff) / 255
  const g = ((value >> 8) & 0xff) / 255
  const b = (value & 0xff) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s, l }
}
