// @vitest-environment node
import { describe, expect, it } from "vitest"
import { cardLayout } from "./cardLayout"
import { splitChunks } from "./chunks"
import { encodeChunks, rasterCodes, type RgbaImage } from "./rasterCodes"
import { readCard } from "./readCard"

const bytes = (length: number, seed: number) =>
  Uint8Array.from({ length }, (_, i) => (i * 131 + seed * 17 + ((i * i) >> 3)) % 256)

const drawCard = async (chunks: Uint8Array[], px: number) => {
  const { version, matrices } = await encodeChunks(chunks)
  return rasterCodes(cardLayout(chunks.length, version), matrices, px)
}

/** Area-average downscale so the long side becomes `long` pixels, like a chat app resize. */
const boxDownscale = (image: RgbaImage, long: number): RgbaImage => {
  const scale = long / Math.max(image.width, image.height)
  const width = Math.round(image.width * scale)
  const height = Math.round(image.height * scale)
  const data = new Uint8ClampedArray(width * height * 4)
  const step = 1 / scale
  for (let y = 0; y < height; y++) {
    const y0 = y * step
    const y1 = y0 + step
    for (let x = 0; x < width; x++) {
      const x0 = x * step
      const x1 = x0 + step
      const sum = [0, 0, 0, 0]
      let area = 0
      for (let sy = Math.floor(y0); sy < Math.min(image.height, Math.ceil(y1)); sy++) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy)
        for (let sx = Math.floor(x0); sx < Math.min(image.width, Math.ceil(x1)); sx++) {
          const weight = wy * (Math.min(x1, sx + 1) - Math.max(x0, sx))
          const o = (sy * image.width + sx) * 4
          for (let c = 0; c < 4; c++) sum[c] += image.data[o + c] * weight
          area += weight
        }
      }
      const o = (y * width + x) * 4
      for (let c = 0; c < 4; c++) data[o + c] = sum[c] / area
    }
  }
  return { width, height, data }
}

describe("save card codes", () => {
  it("reads back every chunk of a four-code card", async () => {
    const chunks = splitChunks(bytes(9_000, 2), 0x4321)
    expect(chunks).toHaveLength(4)
    expect(await readCard(await drawCard(chunks, 3))).toEqual(chunks)
  })

  it("reads a card scaled down to 1280 px", async () => {
    const chunks = splitChunks(bytes(4 * 2_900, 3), 0x0abc)
    expect(chunks).toHaveLength(4)
    const card = await drawCard(chunks, 3)
    expect(Math.max(card.width, card.height)).toBeGreaterThan(1_280)
    expect(await readCard(boxDownscale(card, 1_280))).toEqual(chunks)
  })

  it("reads a one-code card", async () => {
    const chunks = splitChunks(bytes(1_701 - 4, 4), 7)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toHaveLength(1_701)
    expect(await readCard(await drawCard(chunks, 3))).toEqual(chunks)
  })

  it("never picks version 23", async () => {
    // 1,050 bytes outgrow version 22-L (1,003) and fit 23-L (1,091).
    const { version } = await encodeChunks([bytes(1_050, 5)])
    expect(version).toBe(24)
  })

  it("finds no card in a plain picture", async () => {
    const width = 600
    const height = 800
    const grey = new Uint8ClampedArray(width * height * 4).fill(128)
    expect(await readCard({ width, height, data: grey })).toBeUndefined()
    const noise = Uint8ClampedArray.from({ length: width * height * 4 }, (_, i) =>
      i % 4 === 3 ? 255 : (i * 2_654_435_761) >>> 24
    )
    expect(await readCard({ width, height, data: noise })).toBeUndefined()
  })
})
