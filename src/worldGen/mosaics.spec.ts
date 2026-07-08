import { describe, expect, it } from "vitest"
import { computeMosaicPaths, countAuthoredTombMosaics } from "./mosaics"
import { WORLD_TARGETS } from "./worldSpec"
import type { PyramidPlan } from "./configBuilder"

const makePlan = (overrides: Partial<PyramidPlan>[]): PyramidPlan[] =>
  overrides.map((o, i) => ({
    journeyId: `j${i}`,
    tier: "starter" as const,
    pathPuzzles: 4,
    pyramidIndex: 0,
    levelCount: 1,
    constraint: {},
    provenance: {},
    ...o,
  }))

// The pyramid-side auto-distributed budget — the world total minus whatever real tombs
// already committed via authored endRewards (see spec/junior.ts's mosaic side path).
const autoBudget = () => WORLD_TARGETS.mosaicPieceRewards - countAuthoredTombMosaics()

describe("computeMosaicPaths", () => {
  it("spreads the pyramid-side auto budget across auto-candidates when nothing is explicit", () => {
    const plan = makePlan(Array(4).fill({}))
    const result = computeMosaicPaths(plan)
    const total = [...result.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(autoBudget())
  })

  it("a SideIntensity string sideSections is explicit, not an auto-candidate", () => {
    const plan = makePlan([{ constraint: { sideSections: "low" } }, {}])
    const result = computeMosaicPaths(plan)
    expect(result.get("j0:0")).toBe(1) // INTENSITY_PATHS.low
  })

  it("a numeric sideSections is explicit and reduces the auto-distributed remainder", () => {
    const plan = makePlan([{ constraint: { sideSections: 5 } }])
    const result = computeMosaicPaths(plan)
    expect(result.get("j0:0")).toBe(5)
  })

  it("pyramids with authored floors[] are excluded from auto-distribution (count 0)", () => {
    const plan = makePlan([{ constraint: { floors: [{}] } }, {}])
    const result = computeMosaicPaths(plan)
    expect(result.get("j0:0")).toBe(0)
  })

  it("mainEndReward: mosaicPiece counts as committed, reducing the auto-distributed remainder", () => {
    const plan = makePlan(Array(4).fill({}))
    const withCommitted = makePlan([{ constraint: { mainEndReward: "mosaicPiece" } }, {}, {}, {}])
    const total = [...computeMosaicPaths(plan).values()].reduce((a, b) => a + b, 0)
    const totalWithCommitted = [...computeMosaicPaths(withCommitted).values()].reduce((a, b) => a + b, 0)
    expect(totalWithCommitted).toBe(total - 1)
  })

  it("bigger pathPuzzles pyramids receive the extra path when the remainder is odd", () => {
    // Soak up the budget down to a remainder of 1 via an explicit filler, so the round-robin
    // distribution only has one path to hand out — it should go to the biggest candidate first.
    const filler = { constraint: { sideSections: autoBudget() - 1 } }
    const plan = makePlan([filler, { pathPuzzles: 1 }, { pathPuzzles: 100 }])
    const result = computeMosaicPaths(plan)
    expect(result.get("j2:0")).toBe(1)
    expect(result.get("j1:0") ?? 0).toBe(0)
  })
})
