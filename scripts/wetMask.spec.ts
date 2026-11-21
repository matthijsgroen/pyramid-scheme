import { describe, expect, it } from "vitest"
import { waterline } from "./wetMask"

/** One row: each pixel is "o<height>" (object), "s" (shadow) or "." (neither). */
const row = (cells: string[], depth: number, reach: number) => {
  const width = cells.length
  const heights = new Float32Array(cells.map(c => (c.startsWith("o") ? Number(c.slice(1)) : 0)))
  const object = new Uint8Array(cells.map(c => (c.startsWith("o") ? 255 : 0)))
  const shadow = new Uint8Array(cells.map(c => (c === "s" ? 255 : 0)))
  const out = waterline({ heights, object, shadow, width, height: 1, depth, reach })
  return Array.from(out, a => (a > 0 ? "^" : "_")).join("")
}

describe("waterline", () => {
  it("shows the object where it stands higher than the water and hides it below", () => {
    expect(row(["o2", "o5", "o9"], 5, 0)).toBe("__^")
  })

  it("hides the shadow, which lies on the floor", () => {
    expect(row(["s", "o9"], 5, 0)).toBe("_^")
  })

  it("gives paint past the model the nearest known pixel's side, and keeps paint far from both", () => {
    expect(row(["o9", ".", ".", ".", ".", ".", "s"], 5, 2)).toBe("^^^^___")
  })

  it("puts paint out of reach under where something known to be under lies above it in its column", () => {
    // One column, top to bottom: a dry lid painted far above, the object's drowned foot, then a foot painted far below.
    const cells = [".", ".", ".", "o9", "o2", ".", ".", "."]
    const out = waterline({
      heights: new Float32Array(cells.map(c => (c.startsWith("o") ? Number(c.slice(1)) : 0))),
      object: new Uint8Array(cells.map(c => (c.startsWith("o") ? 255 : 0))),
      shadow: new Uint8Array(cells.length),
      width: 1,
      height: cells.length,
      depth: 5,
      reach: 1,
    })
    expect(Array.from(out, a => (a > 0 ? "^" : "_")).join("")).toBe("^^^^____")
  })
})
