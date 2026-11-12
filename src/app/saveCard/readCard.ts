import type { CardLayout, Rect } from "./cardLayout"
import { cardLayout, QUIET_ZONE } from "./cardLayout"
import { chunkCount, joinChunks } from "./chunks"
import type { RgbaImage } from "./rasterCodes"

type Grey = { g: Float32Array; w: number; h: number }
type Decode = (data: Uint8ClampedArray, width: number, height: number) => Uint8Array | undefined

const MAX_CODES = 9
const UNREADABLE_VERSION = 23
const DARK = 90
const ASPECT_TOLERANCE = 0.01
const MIN_TIMING_SCORE = 0.85
const CLEAN_PX = 4

const toGrey = ({ width, height, data }: RgbaImage): Grey => {
  const g = new Float32Array(width * height)
  for (let i = 0; i < g.length; i++) {
    g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return { g, w: width, h: height }
}

/** The card's ink border: the first row or column from each edge that is mostly dark. */
const findFrame = ({ g, w, h }: Grey): Rect => {
  const rowDark = (y: number) => {
    let n = 0
    for (let x = 0; x < w; x++) if (g[y * w + x] < DARK) n++
    return n / w
  }
  const colDark = (x: number) => {
    let n = 0
    for (let y = 0; y < h; y++) if (g[y * w + x] < DARK) n++
    return n / h
  }
  let top = 0
  while (top < h && rowDark(top) < 0.5) top++
  let bottom = h - 1
  while (bottom > top && rowDark(bottom) < 0.5) bottom--
  let left = 0
  while (left < w && colDark(left) < 0.5) left++
  let right = w - 1
  while (right > left && colDark(right) < 0.5) right--
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
}

/** Image coordinates of the centre of module (x, y) of code `cell`. */
const modulePoint = (layout: CardLayout, frame: Rect, cell: number, x: number, y: number) => {
  const c = layout.cells[cell]
  return [
    frame.x + ((c.x + QUIET_ZONE + x + 0.5) * frame.w) / layout.W - 0.5,
    frame.y + ((c.y + QUIET_ZONE + y + 0.5) * frame.h) / layout.H - 0.5,
  ]
}

/**
 * Cheap check that a candidate layout matches the image: between the finders, row 6 and column 6
 * of the first code are the timing pattern, strictly alternating dark and light, and the other two
 * finder centres are dark. Only the true module grid gives that.
 */
const timingScore = ({ g, w, h }: Grey, layout: CardLayout, frame: Rect) => {
  const size = layout.size
  const at = (x: number, y: number) => {
    const [px, py] = modulePoint(layout, frame, 0, x, y)
    return g[Math.min(h - 1, Math.round(py)) * w + Math.min(w - 1, Math.round(px))]
  }
  let sum = 0
  for (let i = 8; i < size - 8; i++) sum += at(i, 6) + at(6, i)
  const threshold = sum / (2 * (size - 16))
  if (at(size - 4, 3) >= threshold || at(3, size - 4) >= threshold) return 0
  let ok = 0
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0
    if (at(i, 6) < threshold === dark) ok++
    if (at(6, i) < threshold === dark) ok++
  }
  return ok / (2 * (size - 16))
}

/**
 * Samples every module centre of one code (bilinear), thresholds at the code's mean and redraws
 * it as a clean code at CLEAN_PX per module, so the decoder only has to decode.
 */
const readCode = ({ g, w, h }: Grey, layout: CardLayout, frame: Rect, cell: number, decode: Decode) => {
  const size = layout.size
  const at = (x: number, y: number) => {
    const x0 = Math.max(0, Math.min(w - 2, Math.floor(x)))
    const y0 = Math.max(0, Math.min(h - 2, Math.floor(y)))
    const fx = x - x0
    const fy = y - y0
    return (
      g[y0 * w + x0] * (1 - fx) * (1 - fy) +
      g[y0 * w + x0 + 1] * fx * (1 - fy) +
      g[(y0 + 1) * w + x0] * (1 - fx) * fy +
      g[(y0 + 1) * w + x0 + 1] * fx * fy
    )
  }
  const values = new Float32Array(size * size)
  let sum = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [px, py] = modulePoint(layout, frame, cell, x, y)
      values[y * size + x] = at(px, py)
      sum += values[y * size + x]
    }
  }
  const threshold = sum / values.length
  const side = (size + 2 * QUIET_ZONE) * CLEAN_PX
  const clean = new Uint8ClampedArray(side * side * 4).fill(255)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (values[y * size + x] >= threshold) continue
      for (let yy = 0; yy < CLEAN_PX; yy++) {
        for (let xx = 0; xx < CLEAN_PX; xx++) {
          const o = (((y + QUIET_ZONE) * CLEAN_PX + yy) * side + (x + QUIET_ZONE) * CLEAN_PX + xx) * 4
          clean[o] = clean[o + 1] = clean[o + 2] = 0
        }
      }
    }
  }
  return decode(clean, side, side)
}

/**
 * Reads the chunks off a card image. The card is its own reference frame: find its border, try
 * every layout whose aspect ratio matches, confirm it on the first code's timing pattern and chunk
 * count, then read every code. Undefined when the image holds no complete card.
 */
export const readCard = async (image: RgbaImage): Promise<Uint8Array[] | undefined> => {
  const { default: jsQR } = await import("jsqr-es6")
  const decode: Decode = (data, width, height) => {
    const result = jsQR(data, width, height, { inversionAttempts: "dontInvert" })
    return result ? Uint8Array.from(result.binaryData) : undefined
  }
  const grey = toGrey(image)
  const frame = findFrame(grey)
  if (frame.w <= 0 || frame.h <= 0 || frame.x >= grey.w || frame.y >= grey.h) return undefined
  const aspect = frame.h / frame.w

  for (let n = 1; n <= MAX_CODES; n++) {
    for (let version = 1; version <= 40; version++) {
      if (version === UNREADABLE_VERSION) continue
      const layout = cardLayout(n, version)
      if (Math.abs(layout.H / layout.W - aspect) > ASPECT_TOLERANCE * aspect) continue
      if (timingScore(grey, layout, frame) < MIN_TIMING_SCORE) continue
      const first = readCode(grey, layout, frame, 0, decode)
      if (!first || chunkCount(first) !== n) continue
      const chunks = [first]
      for (let cell = 1; cell < n; cell++) {
        const chunk = readCode(grey, layout, frame, cell, decode)
        if (!chunk) return undefined
        chunks.push(chunk)
      }
      return joinChunks(chunks) ? chunks : undefined
    }
  }
  return undefined
}
