import { describe, expect, it } from "vitest"
import { panelPath, squareCut } from "./importPanel"

describe("squareCut", () => {
  it("keeps the whole of a square return", () => {
    expect(squareCut({ width: 300, height: 300 })).toEqual({ left: 0, top: 0, width: 300, height: 300 })
  })

  it("cuts the middle out of a wide return, keeping its full height", () => {
    expect(squareCut({ width: 500, height: 300 })).toEqual({ left: 100, top: 0, width: 300, height: 300 })
  })

  it("cuts the middle out of a tall return, keeping its full width", () => {
    expect(squareCut({ width: 300, height: 401 })).toEqual({ left: 0, top: 50, width: 300, height: 300 })
  })
})

describe("panelPath", () => {
  it("is the rank's own wall in the tomb-wall assets", () => {
    expect(panelPath("junior")).toBe("src/assets/tombWall/junior.webp")
  })
})
