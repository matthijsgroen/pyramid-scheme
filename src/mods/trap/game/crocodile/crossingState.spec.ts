import { describe, expect, it } from "vitest"
import { bitten, clearBite, createCrossingState, resetCrossing, stepOnto } from "./crossingState"

describe("crossing state", () => {
  it("starts on the near bank", () => {
    expect(createCrossingState()).toEqual({ path: [], bites: 0 })
  })

  it("records each stone stepped on", () => {
    const state = stepOnto(0)(stepOnto(2)(createCrossingState()))
    expect(state.path).toEqual([2, 0])
  })

  it("sends a bitten player back to the bank, and counts the bite", () => {
    const crossed = stepOnto(0)(stepOnto(2)(createCrossingState()))
    const bit = bitten(2, 1)(crossed)
    expect(bit).toEqual({ path: [], bites: 1, bittenAt: { column: 2, stone: 1 } })
    expect(clearBite(bit)).toEqual({ path: [], bites: 1 })
  })

  it("keeps the bite tally across a reset — the board restarts, the health spent does not come back", () => {
    const bit = bitten(1, 0)(stepOnto(0)(createCrossingState()))
    expect(resetCrossing(bit)).toEqual({ path: [], bites: 1 })
  })
})
