import { describe, expect, it } from "vitest"
import { journey, sidePath } from "./dsl"
import type { Rule } from "./dsl"
import { resolvePyramidConstraint } from "./constraintResolver"
import { buildSite } from "./buildSite"

const JOURNEY = "spec_oneway_journey"
const TIER = "junior"

const specRules: Rule[] = [
  journey(JOURNEY)
    .pyramid(2, { difficulty: TIER })
    .floor(0, {
      pathPuzzles: 2,
      sideSections: [sidePath({ puzzles: 1, label: "upper" }), sidePath({ puzzles: 1, label: "lower" })],
      oneWays: [{ from: "upper", to: "lower" }],
    }),
]

const builtFloors = () =>
  buildSite({
    journeyId: JOURNEY,
    tier: TIER,
    pyramidIndex: 1,
    levelCount: 4,
    pathPuzzles: 2,
    constraint: resolvePyramidConstraint(specRules, JOURNEY, TIER, 1, 4),
    difficulty: TIER,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" }),
  }).floors

describe("one-ways authored in the DSL", () => {
  it("reach the built floor config as the rule wrote them", () => {
    expect(builtFloors()[0].oneWays).toEqual([{ from: "upper", to: "lower" }])
  })

  it("name sections by the label they were authored with", () => {
    const labels = builtFloors()[0].sideSections.map(section => section.label)
    expect(labels).toEqual(["upper", "lower"])
  })
})
