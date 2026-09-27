import { describe, expect, it } from "vitest"
import { journey, sidePath } from "./dsl"
import type { Rule } from "./dsl"
import { resolvePyramidConstraint } from "./constraintResolver"
import { buildSite } from "./buildSite"
import { generateFile } from "./serializer"
import { findUndrawnHandles } from "./validate"
import { DEV_CAPABILITIES, PYRAMID_CAPABILITIES } from "./capabilities"
import { PYRAMID_JOURNEYS } from "./data"
import type { SiteConfig } from "./types"

const TIER = "junior"
const HANDLE = [{ in: "lever", drives: ["vault"] }]
const PATHS = () => [sidePath({ puzzles: 1, label: "lever" }), sidePath({ puzzles: 1, label: "vault" })]

const builtFloors = (rules: Rule[], journeyId: string) =>
  buildSite({
    journeyId,
    tier: TIER,
    pyramidIndex: 1,
    levelCount: 4,
    pathPuzzles: 2,
    constraint: resolvePyramidConstraint(rules, journeyId, TIER, 1, 4),
    difficulty: TIER,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" }),
  }).floors

describe("handles authored in the DSL", () => {
  it("reach the built floor config as the floor rule wrote them", () => {
    const id = "spec_handle_floor_journey"
    const rules: Rule[] = [
      journey(id).pyramid(2, { difficulty: TIER }).floor(0, { pathPuzzles: 2, sideSections: PATHS(), handles: HANDLE }),
    ]
    expect(builtFloors(rules, id)[0].handles).toEqual(HANDLE)
  })

  it("reach the plain floor a pyramid produces when authored once on the pyramid", () => {
    const id = "spec_handle_pyramid_journey"
    const rules: Rule[] = [journey(id).pyramid(2, { difficulty: TIER, sideSections: PATHS(), handles: HANDLE })]
    expect(builtFloors(rules, id)[0].handles).toEqual(HANDLE)
  })
})

describe("a handle written out to the generated world", () => {
  it("survives being serialized", () => {
    const config: SiteConfig = [
      {
        pathPuzzles: 1,
        difficulty: TIER,
        end: "treasure",
        exitOrStaircase: "exit",
        sideSections: [
          { pathPuzzles: 1, difficulty: TIER, end: "treasure", label: "lever" },
          { pathPuzzles: 1, difficulty: TIER, end: "treasure", label: "vault" },
        ],
        handles: HANDLE,
      },
    ]
    expect(generateFile({ test_journey: [config] })).toContain(`handles: [{ in: "lever", drives: ["vault"] }]`)
  })
})

describe("findUndrawnHandles", () => {
  const shipped = PYRAMID_JOURNEYS[0].id
  const floor = (handles?: SiteConfig[number]["handles"]): SiteConfig[number] => ({
    pathPuzzles: 1,
    difficulty: TIER,
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
    ...(handles ? { handles } : {}),
  })

  it("names the floor a lever stands on, and the section it drives", () => {
    expect(findUndrawnHandles({ [shipped]: [[floor()], [floor(), floor(HANDLE)]] })).toEqual([
      { journeyId: shipped, levelNr: 2, floorIndex: 1, in: "lever", drives: ["vault"] },
    ])
  })

  it("excuses a site whose capabilities say it may stand one", () => {
    const configs = { [shipped]: [[floor(HANDLE)]] }
    expect(findUndrawnHandles(configs, () => DEV_CAPABILITIES)).toEqual([])
    expect(findUndrawnHandles(configs, () => PYRAMID_CAPABILITIES)).toHaveLength(1)
  })

  it("refuses a site nothing knows about, which nothing cleared either", () => {
    expect(findUndrawnHandles({ unknown: [[floor(HANDLE)]] })).toHaveLength(1)
  })

  it("says nothing about a floor that stands no lever", () => {
    expect(findUndrawnHandles({ [shipped]: [[floor()]] })).toEqual([])
  })
})
