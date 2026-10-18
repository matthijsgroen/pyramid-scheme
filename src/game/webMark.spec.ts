import { describe, expect, it } from "vitest"
import { allocateMarks, MARK_GLYPHS, markFor, WEB_MARK_GLYPHS, webMarkFor } from "./mark"
import { potKey, webKey } from "./webLine"

const NAMES = ["moon", "sun", "star", "ankh", "reed", "w1p1", "w2p3", "weighing", "a", "b", "c", "d", "e", "f"]

describe("a web mark", () => {
  it("never equals a floor mark, on glyph or on pair", () => {
    const floorMarks = Array.from({ length: 60 }, (_, n) => markFor(n))
    const allocated = [
      ...allocateMarks(Array.from({ length: 12 }, (_, n) => ({ id: `m${n}`, seed: n }))).marks.values(),
    ]
    for (const name of NAMES)
      for (const mark of [webMarkFor(webKey(name)), webMarkFor(potKey(name, 2))]) {
        expect(MARK_GLYPHS).not.toContain(mark.glyph)
        for (const floor of [...floorMarks, ...allocated])
          expect(`${floor.color}/${floor.glyph}`).not.toBe(`${mark.color}/${mark.glyph}`)
      }
  })

  it("draws from a glyph set disjoint from the floor's", () => {
    expect(WEB_MARK_GLYPHS.filter(glyph => MARK_GLYPHS.includes(glyph))).toEqual([])
  })

  it("is the same for every stop of a pot and carries the stop it waits for", () => {
    const [one, two] = [webMarkFor(potKey("moon", 1)), webMarkFor(potKey("moon", 2))]
    expect(one.glyph).toBe(two.glyph)
    expect([one.count, two.count]).toEqual([1, 2])
    expect(webMarkFor(webKey("moon")).count).toBeUndefined()
    expect(one.web).toBe(true)
  })
})
