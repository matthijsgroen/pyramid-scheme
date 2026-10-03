import { describe, expect, it } from "vitest"
import { allocateMarks, MARK_GLYPHS } from "./mark"

const glyphsOf = (marks: Map<string, { glyph: number }>) => [...marks.values()].map(mark => mark.glyph)

describe("allocating the marks of one floor", () => {
  it("gives two mechanics that prefer the same glyph a glyph each", () => {
    const { marks, unmarked } = allocateMarks([
      { id: "a", seed: 2 },
      { id: "b", seed: 2 + MARK_GLYPHS.length },
    ])
    expect(unmarked).toEqual([])
    expect(marks.get("a")!.glyph).toBe(MARK_GLYPHS[2])
    expect(new Set(glyphsOf(marks)).size).toBe(2)
  })

  it("lets the earlier-authored mechanic keep the glyph both prefer", () => {
    const { marks } = allocateMarks([
      { id: "first", seed: 4 },
      { id: "second", seed: 4 },
    ])
    expect(marks.get("first")!.glyph).toBe(MARK_GLYPHS[4])
    expect(marks.get("second")!.glyph).not.toBe(MARK_GLYPHS[4])
  })

  it("leaves every existing mark alone when one more mechanic is authored after them", () => {
    const before = [
      { id: "a", seed: 1 },
      { id: "b", seed: 1 },
      { id: "c", seed: 7 },
    ]
    for (let seed = 0; seed < MARK_GLYPHS.length; seed++) {
      const after = allocateMarks([...before, { id: "d", seed }])
      expect([...allocateMarks(before).marks].every(([id, mark]) => after.marks.get(id)?.glyph === mark.glyph)).toBe(
        true
      )
    }
  })

  it("gives a sequence's tiles hieroglyphs distinct from each other and from every mark on the floor", () => {
    const { marks, tileGlyphs, unmarked } = allocateMarks(
      [
        { id: "lever", seed: 0 },
        { id: "torch", seed: 1 },
      ],
      [
        { id: "tile0", seed: 0 },
        { id: "tile1", seed: 0 },
        { id: "tile2", seed: 1 },
      ]
    )
    expect(unmarked).toEqual([])
    const all = [...glyphsOf(marks), ...tileGlyphs.values()]
    expect(all).toHaveLength(5)
    expect(new Set(all).size).toBe(5)
  })

  it("never moves a mechanic's mark for the sake of a sequence's tiles", () => {
    const alone = allocateMarks([{ id: "lever", seed: 3 }])
    const withTiles = allocateMarks([{ id: "lever", seed: 3 }], [{ id: "tile", seed: 3 }])
    expect(withTiles.marks.get("lever")).toEqual(alone.marks.get("lever"))
  })

  it("names the requests that found no glyph left, and reuses none", () => {
    const requests = Array.from({ length: MARK_GLYPHS.length + 2 }, (_, i) => ({ id: `m${i}`, seed: 0 }))
    const { marks, unmarked } = allocateMarks(requests)
    expect(unmarked).toEqual([`m${MARK_GLYPHS.length}`, `m${MARK_GLYPHS.length + 1}`])
    expect(new Set(glyphsOf(marks)).size).toBe(MARK_GLYPHS.length)
  })

  it("names the tiles that no glyph is left for once the marks have taken their share", () => {
    const mechanics = Array.from({ length: MARK_GLYPHS.length - 1 }, (_, i) => ({ id: `m${i}`, seed: i }))
    const { unmarked } = allocateMarks(mechanics, [
      { id: "t0", seed: 0 },
      { id: "t1", seed: 0 },
    ])
    expect(unmarked).toEqual(["t1"])
  })
})
