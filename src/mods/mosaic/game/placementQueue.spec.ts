import { describe, it, expect } from "vitest"
import { carriedPieces, nextPlacement, revealedPieceIds, stepsOf, type TierCounts } from "./placementQueue"
import { MOSAIC_TIERS } from "./mosaicCurrency"

const counts = (over: Partial<TierCounts> = {}): TierCounts =>
  Object.fromEntries(MOSAIC_TIERS.map(t => [t, over[t] ?? 0])) as TierCounts

describe("mosaic placement queue", () => {
  it("carries what is found but not yet set in", () => {
    expect(carriedPieces(counts({ starter: 3 }), counts({ starter: 1 }))).toEqual([{ tier: "starter", count: 2 }])
  })

  it("carries nothing once every found piece is placed", () => {
    expect(carriedPieces(counts({ junior: 4 }), counts({ junior: 4 }))).toEqual([])
  })

  it("never carries more than a register has room for", () => {
    // A piece past its register's last step would reveal nothing, so it is not placeable.
    const room = stepsOf("starter").length
    expect(carriedPieces(counts({ starter: room + 5 }), counts())).toEqual([{ tier: "starter", count: room }])
  })

  it("fills the lowest register first", () => {
    const next = nextPlacement(counts({ starter: 1, wizard: 1 }), counts())
    expect(next?.tier).toBe("starter")
  })

  it("moves on to the next register once one is full", () => {
    const full = stepsOf("starter").length
    const next = nextPlacement(counts({ starter: full, junior: 1 }), counts({ starter: full }))
    expect(next?.tier).toBe("junior")
  })

  it("hands over the pieces of the step being placed", () => {
    const next = nextPlacement(counts({ starter: 1 }), counts())
    expect(next?.pieceIds.length).toBeGreaterThan(0)
  })

  it("reveals nothing until something is placed, and grows with each one", () => {
    expect(revealedPieceIds(counts()).size).toBe(0)
    const one = revealedPieceIds(counts({ starter: 1 })).size
    const two = revealedPieceIds(counts({ starter: 2 })).size
    expect(one).toBeGreaterThan(0)
    expect(two).toBeGreaterThan(one)
  })
})
