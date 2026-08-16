import { describe, expect, it } from "vitest"
import {
  applySwap,
  createBalanceState,
  removeNote,
  selectGlyph,
  setWeight,
  swapSources,
  tapPiece,
} from "./balanceState"
import type { BalancePuzzleData, PanItem, Scale } from "./techniques"

const glyphs = ["a", "b"]

describe("weighing glyphs", () => {
  it("starts on the first glyph with nothing weighed and no notes", () => {
    expect(createBalanceState(glyphs)).toEqual({ values: {}, selected: "a", notes: [] })
  })

  it("weighs the selected glyph and walks on to the next one still missing a weight", () => {
    const state = setWeight(createBalanceState(glyphs), glyphs, 5)
    expect(state.values.a).toBe(5)
    expect(state.selected).toBe("b")
  })

  it("takes a weight off again when the glyph's own weight is tapped", () => {
    const weighed = setWeight(createBalanceState(glyphs), glyphs, 5)
    const cleared = setWeight(selectGlyph(weighed, "a"), glyphs, 5)
    expect(cleared.values.a).toBeUndefined()
    // Nothing to walk on to: the glyph just cleared is the first one missing a weight again.
    expect(cleared.selected).toBe("a")
  })

  it("stays put once every glyph has a weight, so the last answer can be corrected", () => {
    const full = setWeight(setWeight(createBalanceState(glyphs), glyphs, 5), glyphs, 3)
    expect(full.selected).toBe("b")
    expect(setWeight(selectGlyph(full, "a"), glyphs, 9).values).toEqual({ a: 9, b: 3 })
  })
})

const piece = (item: string): PanItem =>
  /\d/.test(item) ? { kind: "weight", value: +item } : { kind: "glyph", glyph: item }
const scale = (left: string, right: string): Scale => ({
  left: left.split(" ").map(piece),
  right: right.split(" ").map(piece),
})

describe("taking the same thing off both pans", () => {
  // `a b 3 = b 9`: the b stands on both pans, and both pans hold stones.
  const puzzle: BalancePuzzleData = { glyphs, scales: [scale("a b 3", "b 9")], maxValue: 12 }
  const state = createBalanceState(glyphs)
  const ref = { kind: "scale", index: 0 } as const

  it("takes a glyph off both pans in one tap, and writes what is left as a note", () => {
    // Tapping the b on the left pan (index 1).
    expect(tapPiece(state, puzzle, ref, "left", 1).notes).toEqual([scale("a 3", "9")])
  })

  it("takes the smaller pile of stones off both pans in one tap", () => {
    // Tapping the 3 on the left pan (index 2): 3 comes off both, leaving 6 on the right.
    expect(tapPiece(state, puzzle, ref, "left", 2).notes).toEqual([scale("a b", "b 6")])
  })

  it("leaves nothing pending — a piece with its twin opposite needs no second tap", () => {
    expect(tapPiece(state, puzzle, ref, "left", 1).pending).toBeUndefined()
  })

  it("writes a note only once", () => {
    const once = tapPiece(state, puzzle, ref, "left", 1)
    expect(tapPiece(once, puzzle, ref, "left", 1).notes).toHaveLength(1)
  })
})

describe("swapping a glyph for what a row says it is worth", () => {
  // The second row says a `b` on its own balances 4, so a `b` anywhere can be traded for a 4.
  const puzzle: BalancePuzzleData = { glyphs, scales: [scale("a b", "10"), scale("b", "4")], maxValue: 12 }
  const tapped = tapPiece(createBalanceState(glyphs), puzzle, { kind: "scale", index: 0 }, "left", 1)

  it("waits for a row once a glyph with no twin is tapped", () => {
    expect(tapped.pending).toEqual({ ref: { kind: "scale", index: 0 }, glyph: "b" })
    expect(swapSources(puzzle, tapped).map(source => source.ref)).toEqual([{ kind: "scale", index: 1 }])
  })

  it("offers nothing until a glyph is tapped, and calls the tap off when it is tapped again", () => {
    expect(swapSources(puzzle, createBalanceState(glyphs))).toEqual([])
    expect(tapPiece(tapped, puzzle, { kind: "scale", index: 0 }, "left", 1).pending).toBeUndefined()
  })

  it("puts the row's other pan in the glyph's place", () => {
    const [source] = swapSources(puzzle, tapped)
    const state = applySwap(tapped, source.note)
    expect(state.notes).toEqual([scale("a 4", "10")])
    expect(state.pending).toBeUndefined()
  })

  it("throws a note away again", () => {
    const [source] = swapSources(puzzle, tapped)
    expect(removeNote(applySwap(tapped, source.note), 0).notes).toEqual([])
  })
})
