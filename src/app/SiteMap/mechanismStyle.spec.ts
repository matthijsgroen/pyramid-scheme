import { describe, expect, it } from "vitest"
import { MECHANISM_STYLE, mechanismStyleOf, styleChain } from "./mechanismStyle"
import { mechanismTileIn } from "./tileAssets"

const files = new Map([
  ["mechanism/light/bone/leverArm", "bone-arm"],
  ["mechanism/light/leverArm", "light-arm"],
  ["mechanism/light/torchLit", "light-torch"],
  ["default/leverArm", "default-arm"],
  ["default/torchLit", "default-torch"],
  ["default/plate", "default-plate"],
  ["placeholder/plate", "stand-in-plate"],
  ["placeholder/gate", "stand-in-gate"],
])

describe("mechanism style chain", () => {
  it("trims a nested style one segment at a time, then ends at default", () => {
    expect(styleChain("light/bone")).toEqual(["light/bone", "light", "default"])
    expect(styleChain("default")).toEqual(["default"])
  })

  it("draws the deepest style that paints the piece", () => {
    expect(mechanismTileIn(files, "light/bone", "leverArm")).toBe("bone-arm")
  })

  it("falls back to the style above when the deepest has none", () => {
    expect(mechanismTileIn(files, "light/bone", "torchLit")).toBe("light-torch")
  })

  it("falls back to default when no style in the chain paints it", () => {
    expect(mechanismTileIn(files, "light/bone", "plate")).toBe("default-plate")
    expect(mechanismTileIn(files, "dark", "leverArm")).toBe("default-arm")
  })

  it("prefers default over the stand-in, and takes the stand-in only when asked", () => {
    expect(mechanismTileIn(files, "light", "plate", true)).toBe("default-plate")
    expect(mechanismTileIn(files, "light/bone", "gate", true)).toBe("stand-in-gate")
    expect(mechanismTileIn(files, "light/bone", "gate")).toBeUndefined()
  })

  it("draws a tileset's own style when no override is given", () => {
    expect(mechanismStyleOf("cave")).toBe(MECHANISM_STYLE.cave)
    expect(mechanismStyleOf("starter")).toBe(MECHANISM_STYLE.starter)
  })

  it("draws the override style instead of the tileset's", () => {
    expect(mechanismTileIn(files, mechanismStyleOf("starter", "light/bone"), "leverArm")).toBe("bone-arm")
    expect(mechanismTileIn(files, mechanismStyleOf("cave", "default"), "leverArm")).toBe("default-arm")
  })
})
