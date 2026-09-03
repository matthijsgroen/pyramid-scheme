import sharp from "sharp"

export const hexToRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
})

/**
 * Makes a generation's background colour transparent.
 *
 * Two things a plain threshold gets wrong, both measured on real returns: a generator hands back
 * `#fd25fd` rather than `#ff00ff`, so the test is a distance with a tolerance and a band of partial
 * alpha beyond it; and about half a subject's edge pixels are part background, which reads as a magenta
 * fringe once the rest is keyed, so magenta specifically is de-spilled by pulling red and blue down to
 * green wherever they both sit above it.
 *
 * Shared, because two scripts need the same behaviour: `import-tile` on every prop, and `make-arch` on
 * the ornament it lays over a lintel.
 */
export const keyOut = async (input: sharp.Sharp, key: string, tolerance: number): Promise<sharp.Sharp> => {
  const { r: kr, g: kg, b: kb } = hexToRgb(key)
  const { data, info } = await input.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const keyIsMagenta = kr > 200 && kb > 200 && kg < 120
  for (let i = 0; i < data.length; i += info.channels) {
    const d = Math.hypot(data[i] - kr, data[i + 1] - kg, data[i + 2] - kb)
    if (d <= tolerance) {
      data[i + 3] = 0
      continue
    }
    if (d < tolerance * 2) data[i + 3] = Math.round(data[i + 3] * ((d - tolerance) / tolerance))
    if (keyIsMagenta) {
      const spill = Math.min(data[i], data[i + 2]) - data[i + 1]
      if (spill > 0) {
        data[i] -= spill
        data[i + 2] -= spill
      }
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
}
