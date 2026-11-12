import type { CardLayout } from "./cardLayout"
import { BORDER, QUIET_ZONE } from "./cardLayout"

export type RgbaImage = { width: number; height: number; data: Uint8ClampedArray }

const INK = [0x2b, 0x21, 0x18] as const
const PAPER = [0xff, 0xf8, 0xea] as const

/** jsqr-es6 never reads version 23 at level L. */
const UNREADABLE_VERSION = 23

/**
 * Encodes every chunk as a byte-mode, level-L code at one shared version: the smallest that
 * carries the largest chunk, so the reader can recover the layout from the card's aspect ratio.
 */
export const encodeChunks = async (chunks: Uint8Array[]): Promise<{ version: number; matrices: boolean[][][] }> => {
  const { create } = await import("qrcode")
  const encode = (chunk: Uint8Array, version: number) => {
    const { size, data } = create([{ data: chunk, mode: "byte" }], {
      errorCorrectionLevel: "L",
      version,
    }).modules
    return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => data[y * size + x] === 1))
  }
  const largest = chunks.reduce((a, b) => (b.length > a.length ? b : a))
  for (let version = 1; version <= 40; version++) {
    if (version === UNREADABLE_VERSION) continue
    try {
      encode(largest, version)
    } catch {
      continue
    }
    return { version, matrices: chunks.map(chunk => encode(chunk, version)) }
  }
  throw new Error(`Chunk of ${largest.length} bytes does not fit a QR code`)
}

/**
 * Draws the bare card at `px` pixels per module: an ink border, a paper inside and the codes.
 * Decoration is drawn on top of this, outside the code cells.
 */
export const rasterCodes = (layout: CardLayout, matrices: boolean[][][], px: number): RgbaImage => {
  const width = layout.W * px
  const height = layout.H * px
  const data = new Uint8ClampedArray(width * height * 4)
  const fill = (x: number, y: number, w: number, h: number, rgb: readonly number[]) => {
    for (let row = y * px; row < (y + h) * px; row++) {
      for (let col = x * px; col < (x + w) * px; col++) {
        const o = (row * width + col) * 4
        data[o] = rgb[0]
        data[o + 1] = rgb[1]
        data[o + 2] = rgb[2]
        data[o + 3] = 255
      }
    }
  }
  fill(0, 0, layout.W, layout.H, INK)
  fill(BORDER, BORDER, layout.W - 2 * BORDER, layout.H - 2 * BORDER, PAPER)
  matrices.forEach((matrix, i) => {
    const cell = layout.cells[i]
    matrix.forEach((line, y) =>
      line.forEach((dark, x) => {
        if (dark) fill(cell.x + QUIET_ZONE + x, cell.y + QUIET_ZONE + y, 1, 1, INK)
      })
    )
  })
  return { width, height, data }
}
