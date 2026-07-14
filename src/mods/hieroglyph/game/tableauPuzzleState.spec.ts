import { describe, expect, it } from "vitest"
import { createTableauPuzzleState, isTableauPuzzleCompleted, toggleTableauTile } from "./tableauPuzzleState"

describe("tableauPuzzleState", () => {
  it("starts empty", () => {
    expect(createTableauPuzzleState()).toEqual({ filledPositions: {}, symbolCounts: {}, inventoryUsage: {} })
  })

  it("places a tile when inventory is available and the target isn't met yet", () => {
    const s0 = createTableauPuzzleState()
    const s1 = toggleTableauTile(s0, "a1", "pos-1", { a1: 1 }, 1)
    expect(s1.filledPositions).toEqual({ "pos-1": 1 })
    expect(s1.symbolCounts).toEqual({ a1: 1 })
    expect(s1.inventoryUsage).toEqual({ a1: 1 })
  })

  it("does not place a tile beyond the target count", () => {
    const s0 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 1 }, 2)
    const s1 = toggleTableauTile(s0, "a1", "pos-2", { a1: 1 }, 2)
    expect(s1.filledPositions).toEqual({ "pos-1": 1 })
  })

  it("does not place a tile when inventory is exhausted", () => {
    const s0 = createTableauPuzzleState()
    const s1 = toggleTableauTile(s0, "a1", "pos-1", { a1: 2 }, 0)
    expect(s1.filledPositions).toEqual({})
  })

  it("removes a filled tile on a second toggle", () => {
    const s0 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 1 }, 1)
    const s1 = toggleTableauTile(s0, "a1", "pos-1", { a1: 1 }, 1)
    expect(s1).toEqual({ filledPositions: {}, symbolCounts: { a1: 0 }, inventoryUsage: { a1: 0 } })
  })

  it("is completed only when every target count is met", () => {
    const s0 = toggleTableauTile(createTableauPuzzleState(), "a1", "pos-1", { a1: 1, a2: 1 }, 1)
    expect(isTableauPuzzleCompleted(s0, { a1: 1, a2: 1 })).toBe(false)
    const s1 = toggleTableauTile(s0, "a2", "pos-2", { a1: 1, a2: 1 }, 1)
    expect(isTableauPuzzleCompleted(s1, { a1: 1, a2: 1 })).toBe(true)
  })
})
