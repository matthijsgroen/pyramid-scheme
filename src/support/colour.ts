// Colour as the renderer composites it and as docs/instructions/map-rendering.md measures it: a wash
// is `art × (1−a) + wash × a`, and a change to the night is read as CIELAB lightness, chroma and hue
// rather than as a WCAG ratio, which is built for text. The WCAG ratio is here for what IS text, and
// for the click marker, which the brief already holds to one.

export type Rgb = readonly [number, number, number]
export type Lch = { L: number; C: number; h: number }

export const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export const parseRgba = (css: string): { rgb: Rgb; alpha: number } => {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/)
  if (!m) throw new Error(`not an rgb colour: ${css}`)
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: m[4] === undefined ? 1 : Number(m[4]) }
}

const linear = (channel: number) => {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export const relativeLuminance = ([r, g, b]: Rgb): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export const wash = (art: Rgb, over: Rgb, alpha: number): Rgb => [
  art[0] * (1 - alpha) + over[0] * alpha,
  art[1] * (1 - alpha) + over[1] * alpha,
  art[2] * (1 - alpha) + over[2] * alpha,
]

const labF = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116)

export const toLch = (rgb: Rgb): Lch => {
  const [r, g, b] = rgb.map(linear)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  const a = 500 * (labF(x) - labF(y))
  const bb = 200 * (labF(y) - labF(z))
  return { L: 116 * labF(y) - 16, C: Math.hypot(a, bb), h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 }
}

export const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
