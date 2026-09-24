import { describe, expect, it } from "vitest"
import { edgeBackground } from "./importPortrait"

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
