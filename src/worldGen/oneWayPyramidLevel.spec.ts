import { describe, expect, it } from "vitest"
import { journey, sidePath } from "./dsl"
import type { Rule } from "./dsl"
import { resolvePyramidConstraint } from "./constraintResolver"
import { buildSite } from "./buildSite"

const JOURNEY = "spec_oneway_pyramid_level_journey"
const TIER = "junior"

// No `.floor()` override at all: `oneWays` is authored once on the pyramid, the way `forks` and
// `switches` already can be — buildSite threads `constraint.oneWays` onto the single plain floor
// this shape produces (no floors[], no mainFloors override, no ward wings/paths), which
// oneWayAuthoring.spec.ts's explicit-`floors[]` fixture never exercises.
const specRules: Rule[] = [
  journey(JOURNEY).pyramid(2, {
    difficulty: TIER,
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

describe("a one-way authored on the pyramid, no per-floor override", () => {
  it("reaches the single plain floor buildSite produces for it", () => {
    expect(builtFloors()[0].oneWays).toEqual([{ from: "upper", to: "lower" }])
  })
})
