import { describe, expect, it } from "vitest"
import { contrastRatio, hexToRgb, hueDistance, parseRgba, toLch, wash } from "./colour"

describe("colour", () => {
  it("reads a hex colour", () => {
    expect(hexToRgb("#ff8000")).toEqual([255, 128, 0])
  })

  it("reads rgba with spaces, and rgb without alpha as opaque", () => {
    expect(parseRgba("rgba(21, 17, 12, 0.2)")).toEqual({ rgb: [21, 17, 12], alpha: 0.2 })
    expect(parseRgba("rgb(1,2,3)")).toEqual({ rgb: [1, 2, 3], alpha: 1 })
  })

  it("rejects what is not a colour", () => {
    expect(() => parseRgba("transparent")).toThrow()
  })

  it("measures black on white as 21:1, and a colour against itself as 1:1", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([120, 80, 40], [120, 80, 40])).toBeCloseTo(1, 5)
  })

  it("washes art toward a colour by alpha", () => {
    expect(wash([200, 100, 0], [0, 0, 0], 0.5)).toEqual([100, 50, 0])
    expect(wash([200, 100, 0], [0, 0, 0], 0)).toEqual([200, 100, 0])
  })

  it("puts white at L* 100 with no chroma, black at 0", () => {
    const white = toLch([255, 255, 255])
    expect(white.L).toBeCloseTo(100, 1)
    expect(white.C).toBeLessThan(0.01)
    expect(toLch([0, 0, 0]).L).toBeCloseTo(0, 5)
  })

  it("reads pure red at the published CIELAB values", () => {
    const red = toLch([255, 0, 0])
    expect(red.L).toBeCloseTo(53.24, 1)
    expect(red.C).toBeCloseTo(104.55, 0)
    expect(red.h).toBeCloseTo(40.0, 0)
  })

  it("measures hue distance the short way round", () => {
    expect(hueDistance(350, 10)).toBe(20)
    expect(hueDistance(10, 190)).toBe(180)
  })
})
