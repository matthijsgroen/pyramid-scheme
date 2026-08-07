import { describe, it, expect } from "vitest"
import { LEVEL_STEPS, PIECES_BY_STEP } from "./mosaicRevealOrder"
import { MOSAIC_PIECES } from "@/ui/atoms/mosaicPieces.generated"

// The reveal order is computed once at module load. Its contract: every piece-bearing step is
// revealed exactly once (a missed step = a mosaic slice that never lights up; a duplicate = a
// double reveal), and the five registers fill one after another rather than interleaving.
const stepKey = (s: { journeyId: string; levelIndex: number }) => `${s.journeyId}:${s.levelIndex}`
const TIERS = ["starter", "junior", "expert", "master", "wizard"]

describe("mosaic reveal order", () => {
  it("reveals every piece-bearing step exactly once (no dupes, no misses)", () => {
    const keys = LEVEL_STEPS.map(stepKey)
    // No duplicates.
    expect(new Set(keys).size).toBe(keys.length)
    // Covers exactly the steps that actually hold pieces.
    const pieceSteps = new Set(MOSAIC_PIECES.map(p => `${p.journeyId}:${p.levelIndex}`))
    expect(new Set(keys)).toEqual(pieceSteps)
  })

  it("finishes one register before starting the next", () => {
    // A panel can only trigger its own completion beat if its tier's steps are contiguous.
    const tierOrder = LEVEL_STEPS.map(s => TIERS.findIndex(t => s.journeyId.startsWith(`${t}_`)))
    expect(tierOrder).not.toContain(-1)
    expect(tierOrder).toEqual([...tierOrder].sort((a, b) => a - b))
  })

  it("groups every piece under its own step in PIECES_BY_STEP", () => {
    const grouped = [...PIECES_BY_STEP.values()].flat()
    expect(grouped.length).toBe(MOSAIC_PIECES.length)
    expect(new Set(grouped)).toEqual(new Set(MOSAIC_PIECES.map(p => p.id)))
    // Each step key resolves to a revealed step (grouping and reveal agree on the step set).
    for (const key of PIECES_BY_STEP.keys()) expect(LEVEL_STEPS.map(stepKey)).toContain(key)
  })
})
