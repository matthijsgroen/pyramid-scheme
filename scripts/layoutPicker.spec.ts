import { describe, expect, it } from "vitest"
import type { FloorConfig } from "../src/game/siteTypes"
import { floorSearch, packingHolds, stageHolds } from "./layoutPicker"

const first = { outsideLock: [4] }
const later = { outsideLock: [3, 4] }

describe("stageHolds", () => {
  it("lets a pin at the first stage be verified with no ledger entry", () => {
    expect(stageHolds({ outsideLock: [4] }, first, undefined, "h")).toBe(true)
  })

  it("lets a later-stage pin be verified while the ledger found it there for the same authoring", () => {
    expect(stageHolds(later, first, { kind: "sidePaths", hash: "h", sidePaths: later }, "h")).toBe(true)
  })

  it("searches a later-stage pin again once the authoring hash moves", () => {
    expect(stageHolds(later, first, { kind: "sidePaths", hash: "old", sidePaths: later }, "h")).toBe(false)
  })

  it("searches a later-stage pin again when the ledger names another stage or none", () => {
    expect(
      stageHolds(
        later,
        first,
        { kind: "sidePaths", hash: "h", sidePaths: { outsideLock: [4], corridorsTakeTwo: true } },
        "h"
      )
    ).toBe(false)
    expect(stageHolds(later, first, undefined, "h")).toBe(false)
  })

  it("tells two to a corridor apart from one to a corridor at the same outside sections", () => {
    const doubled = { outsideLock: [4], corridorsTakeTwo: true as const }
    expect(stageHolds(doubled, first, undefined, "h")).toBe(false)
  })
})

describe("packingHolds", () => {
  it("verifies a pin at or above the authored packing, or one that names none", () => {
    expect(packingHolds(0.3, 0.3)).toBe(true)
    expect(packingHolds(0.5, 0.3)).toBe(true)
    expect(packingHolds(undefined, 0.3)).toBe(true)
  })

  it("searches a pin below the authored packing again", () => {
    expect(packingHolds(0.1, 0.3)).toBe(false)
  })
})

describe("a raised packing", () => {
  const floor = (more: Partial<FloorConfig>): FloorConfig => ({
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
    ...more,
  })

  it("lengthens the main path alone: the side paths keep the packing the author wrote", () => {
    const { packed } = floorSearch("made-up", floor({ packing: 0.2 }), 1, 0)
    expect(packed(0.2)).toEqual({ packing: 0.2, sidePacking: undefined })
    expect(packed(0.4)).toEqual({ packing: 0.4, sidePacking: 0.2 })
  })

  it("leaves a side packing the author wrote as it is", () => {
    const { packed } = floorSearch("made-up", floor({ packing: 0.2, sidePacking: 0.6 }), 1, 0)
    expect(packed(0.4)).toEqual({ packing: 0.4, sidePacking: 0.6 })
  })
})
