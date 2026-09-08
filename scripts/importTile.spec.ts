import { describe, expect, it } from "vitest"
import { growMask } from "./importTile"

/** A 5x1 strip: one mask pixel at x=0, then four outside it. */
const strip = (artLums: number[], radius: number) => {
  const width = artLums.length
  const mask = new Uint8Array(width * 4)
  mask[3] = 255 // only x=0 is inside
  const art = new Uint8Array(width * 4)
  artLums.forEach((l, i) => {
    art[i * 4] = l
    art[i * 4 + 1] = l
    art[i * 4 + 2] = l
    art[i * 4 + 3] = 255
  })
  const out = growMask({ mask, maskChannels: 4, art, artChannels: 4, width, height: 1, radius })
  return Array.from({ length: width }, (_, i) => out[i * 4 + 3] > 128)
}

describe("growMask", () => {
  it("keeps the original mask whatever the art under it looks like", () => {
    // x=0 is inside the mask and pitch black — an object's own dark parts are never filtered.
    expect(strip([0, 0, 0, 0, 0], 0)[0]).toBe(true)
  })

  it("admits nothing at radius 0", () => {
    expect(strip([255, 255, 255, 255, 255], 0)).toEqual([true, false, false, false, false])
  })

  it("admits LIGHT paint within the radius — the fronds the repaint added", () => {
    expect(strip([255, 255, 255, 255, 255], 2)).toEqual([true, true, true, false, false])
  })

  it("REFUSES dark paint within the radius — the shadow the repaint added", () => {
    // Same geometry, but what was added is shadow-dark: the growth must not take it.
    expect(strip([255, 20, 20, 20, 20], 2)).toEqual([true, false, false, false, false])
  })

  it("decides pixel by pixel, so a frond beside a shadow survives", () => {
    expect(strip([255, 20, 255, 255, 255], 2)).toEqual([true, false, true, false, false])
  })

  it("ignores transparent paint, which is background rather than something added", () => {
    const width = 3
    const mask = new Uint8Array(width * 4)
    mask[3] = 255
    const art = new Uint8Array(width * 4)
    for (let i = 0; i < width; i++) {
      art[i * 4] = art[i * 4 + 1] = art[i * 4 + 2] = 255
      art[i * 4 + 3] = i === 1 ? 0 : 255 // x=1 is transparent
    }
    const out = growMask({ mask, maskChannels: 4, art, artChannels: 4, width, height: 1, radius: 1 })
    expect(out[1 * 4 + 3] > 128).toBe(false)
  })
})
