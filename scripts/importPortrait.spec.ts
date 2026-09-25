import { describe, expect, it } from "vitest"
import { edgeBackground, seat } from "./importPortrait"

const WHITE = { r: 255, g: 255, b: 255 }

/** A grid of `.` white and `#` black, read as RGBA the way sharp hands it over. */
const grid = (rows: string[]) => {
  const width = rows[0].length
  const height = rows.length
  const data = new Uint8Array(width * height * 4)
  rows.forEach((row, y) =>
    [...row].forEach((cell, x) => {
      const value = cell === "." ? 255 : 0
      const i = (y * width + x) * 4
      data[i] = data[i + 1] = data[i + 2] = value
      data[i + 3] = 255
    })
  )
  const background = edgeBackground({ data, width, height, channels: 4, key: WHITE, tolerance: 20 })
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => (background[y * width + x] === 1 ? "b" : "f")).join("")
  )
}

describe("edgeBackground", () => {
  it("takes the white that reaches the edge", () => {
    expect(grid([".....", ".###.", ".....", "....."])).toEqual(["bbbbb", "bfffb", "bbbbb", "bbbbb"])
  })

  it("LEAVES the white the figure encloses — that white is an eye", () => {
    expect(grid([".....", ".###.", ".#.#.", ".###.", "....."])[2]).toBe("bfffb")
  })

  it("does not reach through a gap one pixel wide", () => {
    // The figure's outline is unbroken, so nothing outside it gets in — but a leak would show here first.
    expect(grid(["...", ".#.", "#.#", ".#."])[2]).toBe("fff")
  })

  it("counts an off-white return as background, within the tolerance", () => {
    const data = new Uint8Array(4 * 4)
    for (let i = 0; i < 4; i++) {
      data[i * 4] = 250
      data[i * 4 + 1] = 248
      data[i * 4 + 2] = 251
      data[i * 4 + 3] = 255
    }
    const background = edgeBackground({ data, width: 4, height: 1, channels: 4, key: WHITE, tolerance: 20 })
    expect([...background]).toEqual([1, 1, 1, 1])
  })

  it("keeps a figure that runs off the edge of the canvas", () => {
    expect(grid(["###", "###"])).toEqual(["fff", "fff"])
  })
})

describe("seat", () => {
  const ratio = ({ canvasWidth, canvasHeight }: { canvasWidth: number; canvasHeight: number }) =>
    +(canvasWidth / canvasHeight).toFixed(2)

  it("gives a standing figure a canvas its height fills and its width does not", () => {
    const canvas = seat({ width: 1206, height: 2382 })
    expect(canvas.wide).toBe(false)
    expect(ratio(canvas)).toBe(0.67)
    expect(canvas.canvasWidth).toBeGreaterThan(1206)
  })

  it("fits a subject WIDER than it is tall by its width, so the air lands above it", () => {
    // The abandoned camp: a pile on the ground, which no height-fitted 2:3 canvas can hold.
    const canvas = seat({ width: 1565, height: 1792 })
    expect(canvas.wide).toBe(true)
    expect(ratio(canvas)).toBe(0.67)
    expect(canvas.canvasWidth).toBeGreaterThanOrEqual(1565)
    expect(canvas.canvasHeight).toBeGreaterThan(1792)
  })

  it("never crops: the canvas holds the whole subject either way", () => {
    for (const figure of [
      { width: 100, height: 3000 },
      { width: 3000, height: 100 },
      { width: 1000, height: 1000 },
    ]) {
      const { canvasWidth, canvasHeight } = seat(figure)
      expect(canvasWidth).toBeGreaterThanOrEqual(figure.width)
      expect(canvasHeight).toBeGreaterThanOrEqual(figure.height)
    }
  })
})
