import { describe, expect, it } from "vitest"
import sharp from "sharp"
import { join } from "node:path"
import { PORTRAITS } from "./portraits"

const ROOT = join(import.meta.dirname, "..", "..", "..")

/** An imported asset's pixels: vite hands the spec `/src/assets/<name>.png`, read from the repository. */
const pixels = async (src: string) => {
  const { data, info } = await sharp(join(ROOT, src.replace(/^\//, "").replace(/\?.*$/, "")))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

type Image = Awaited<ReturnType<typeof pixels>>

/** The default base's head: the first 100 opaque rows, as wide as they run. */
const headOf = ({ data, width, height }: Image) => {
  const opaque = (x: number, y: number) => data[(y * width + x) * 4 + 3] >= 250
  let top = 0
  while (top < height && ![...Array(width).keys()].some(x => opaque(x, top))) top++
  const bottom = Math.min(height - 1, top + 100)
  let left = width
  let right = -1
  for (let y = top; y <= bottom; y++)
    for (let x = 0; x < width; x++)
      if (opaque(x, y)) {
        left = Math.min(left, x)
        right = Math.max(right, x)
      }
  return { left, right, top, bottom }
}

type Box = ReturnType<typeof headOf>

/**
 * Where `layer` puts what it shares with `base`: the shift at which most of the pixels compared agree in
 * colour — inside `box` where both are solid for a pose base, and everywhere the layer paints at all for a
 * face, whose feathered edge is the base's own picture. Counting agreement rather than summing difference
 * lets a new pose or a new expression differ where it was drawn to without pulling the answer.
 */
const shift = (base: Image, layer: Image, box: Box, layerAlpha: number, radius = 6) => {
  let best = { dx: 0, dy: 0, agree: -1 }
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      let agree = 0
      for (let y = box.top; y <= box.bottom; y++)
        for (let x = box.left; x <= box.right; x++) {
          const lx = x + dx
          const ly = y + dy
          if (lx < 0 || ly < 0 || lx >= layer.width || ly >= layer.height) continue
          const a = (y * base.width + x) * 4
          const b = (ly * layer.width + lx) * 4
          if (base.data[a + 3] < 250 || layer.data[b + 3] < layerAlpha) continue
          const d = Math.hypot(
            base.data[a] - layer.data[b],
            base.data[a + 1] - layer.data[b + 1],
            base.data[a + 2] - layer.data[b + 2]
          )
          if (d < 24) agree++
        }
      const closer = Math.abs(dx) + Math.abs(dy) < Math.abs(best.dx) + Math.abs(best.dy)
      if (agree > best.agree || (agree === best.agree && closer)) best = { dx, dy, agree }
    }
  return { dx: best.dx, dy: best.dy }
}

const layered = Object.entries(PORTRAITS).flatMap(([speaker, portraits]) => {
  const master = portraits.bases.default?.src
  if (!master) return []
  const others = [
    ...Object.entries(portraits.bases)
      .filter(([base]) => base !== "default")
      .map(([base, art]) => ({ what: `the ${base} base`, src: art.src, face: false })),
    ...Object.entries(portraits.faces ?? {}).map(([face, src]) => ({ what: `the ${face} face`, src, face: true })),
  ]
  return others.map(other => ({ speaker, master, ...other }))
})

describe("every base and face of a speaker holds the head where the default base has it", () => {
  it.each(layered)("$speaker: $what", async ({ master, src, face }) => {
    const base = await pixels(master)
    const layer = await pixels(src)
    const whole = { left: 0, right: base.width - 1, top: 0, bottom: base.height - 1 }

    expect({ width: layer.width, height: layer.height }).toEqual({ width: base.width, height: base.height })
    expect(face ? shift(base, layer, whole, 1) : shift(base, layer, headOf(base), 250)).toEqual({ dx: 0, dy: 0 })
  })
})
