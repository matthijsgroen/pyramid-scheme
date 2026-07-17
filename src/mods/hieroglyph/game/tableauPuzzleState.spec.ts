import { describe, expect, it } from "vitest"
import { createTableauPuzzleState, isTableauPuzzleCompleted, toggleTableauTile } from "./tableauPuzzleState"

describe("tableauPuzzleState", () => {
  it("starts empty", () => {
    expect(createTableauPuzzleState()).toEqual({ filledPositions: {}, symbolCounts: {} })
  })

  it("places a tile when the hieroglyph is owned and the target isn't met yet", () => {
    const s1 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 1 }, true)
    expect(s1.filledPositions).toEqual({ "pos-1": 1 })
    expect(s1.symbolCounts).toEqual({ a1: 1 })
  })

  it("does not place a tile beyond the target count", () => {
    const s0 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 1 }, true)
    const s1 = toggleTableauTile(s0, "a1", "pos-2", { a1: 1 }, true)
    expect(s1.filledPositions).toEqual({ "pos-1": 1 })
  })

  it("does not place a tile when the hieroglyph is not owned", () => {
    const s1 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 2 }, false)
    expect(s1.filledPositions).toEqual({})
  })

  it("reuses one owned hieroglyph across all of its slots — nothing consumed", () => {
    const s0 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 3 }, true)
    const s1 = toggleTableauTile(s0, "a1", "pos-2", { a1: 3 }, true)
    const s2 = toggleTableauTile(s1, "a1", "pos-3", { a1: 3 }, true)
    expect(s2.symbolCounts).toEqual({ a1: 3 })
    expect(Object.keys(s2.filledPositions)).toHaveLength(3)
  })

  it("removes a filled tile on a second toggle", () => {
    const s0 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 1 }, true)
    const s1 = toggleTableauTile(s0, "a1", "pos-1", { a1: 1 }, true)
    expect(s1).toEqual({ filledPositions: {}, symbolCounts: { a1: 0 } })
  })

  it("is completed only when every target count is met", () => {
    const s0 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 1, a2: 1 }, true)
    expect(isTableauPuzzleCompleted(s0, { a1: 1, a2: 1 })).toBe(false)
    const s1 = toggleTableauTile(s0, "a2", "pos-2", { a1: 1, a2: 1 }, true)
    expect(isTableauPuzzleCompleted(s1, { a1: 1, a2: 1 })).toBe(true)
  })
})
