import { describe, expect, it } from "vitest"
import { bustWindow, edgeBackground, headCentre, seat, topBand } from "./importPortrait"

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

/** The figure mask a bust is cut from: `#` is figure, `.` is background that reached the edge. */
const mask = (rows: string[]) => {
  const width = rows[0].length
  const background = new Uint8Array(width * rows.length)
  rows.forEach((row, y) => [...row].forEach((cell, x) => (background[y * width + x] = cell === "." ? 1 : 0)))
  const figure = { left: 0, right: width - 1, top: 0, bottom: rows.length - 1 }
  return { background, width, figure }
}

describe("topBand", () => {
  // A standing figure: narrow head, wide shoulders, then legs that are narrower again.
  const FIGURE = ["..##..", ".####.", "######", "..##..", "..##..", "..##.."]

  it("keeps the top fraction of the figure and drops the rest", () => {
    const { background, width, figure } = mask(FIGURE)

    expect(topBand(background, width, figure, 0.5).bottom).toBe(2)
  })

  it("takes the band's OWN width, not the whole figure's", () => {
    // Framing the head on a box that includes the stance seats the crop in air.
    const { background, width, figure } = mask(["..##..", "..##..", "######"])
    const band = topBand(background, width, figure, 0.5)

    expect([band.left, band.right]).toEqual([2, 3])
  })

  it("never asks for more than the figure has", () => {
    const { background, width, figure } = mask(FIGURE)

    expect(topBand(background, width, figure, 2).bottom).toBe(figure.bottom)
  })
})

describe("headCentre", () => {
  it("is the middle of the topmost slice, not of the whole figure", () => {
    // An arm held out to one side drags the bounding box with it; the face does not move. Odd-width
    // head, so the answer is a column rather than a rounding decision.
    const { background, width, figure } = mask(["..###.....", "..###.....", "..########"])

    expect(headCentre(background, width, figure, 0.34)).toBe(3)
  })

  it("ignores an arm that only appears lower down", () => {
    const narrow = mask(["..###.....", "..###.....", "..###....."])
    const reaching = mask(["..###.....", "..###.....", "..########"])

    expect(headCentre(reaching.background, reaching.width, reaching.figure, 0.34)).toBe(
      headCentre(narrow.background, narrow.width, narrow.figure, 0.34)
    )
  })
})

describe("bustWindow", () => {
  const window = bustWindow({ top: 100, bottom: 399 }, 500)

  it("is 2:3, like every frame these end up in", () => {
    expect(+(window.width / window.height).toFixed(2)).toBe(+(250 / 375).toFixed(2))
  })

  it("sits the cut on the bottom edge and leaves air above the head", () => {
    expect(window.top + window.height).toBe(400)
    expect(window.height).toBeGreaterThan(300)
  })

  it("centres on the head even when that runs off the source, so faces never slide off-centre", () => {
    expect(bustWindow({ top: 0, bottom: 299 }, 10).left).toBeLessThan(0)
  })
})
