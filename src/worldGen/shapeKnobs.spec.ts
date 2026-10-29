import { describe, expect, it } from "vitest"
import { journey, sidePath } from "./dsl"
import type { Rule } from "./dsl"
import { resolvePyramidConstraint } from "./constraintResolver"
import { buildSite } from "./buildSite"
import { firstCarved, plainFloor, prepOf } from "../game/carve/carveFixtures"

const JOURNEY = "spec_shape_journey"
const TIER = "junior"

const floorsOf = (rules: Rule[]) =>
  buildSite({
    journeyId: JOURNEY,
    tier: TIER,
    pyramidIndex: 1,
    levelCount: 4,
    pathPuzzles: 2,
    constraint: resolvePyramidConstraint(rules, JOURNEY, TIER, 1, 4),
    difficulty: TIER,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" }),
  }).floors

const twoFloors = (pyramid: object, floor: object): Rule[] => [
  journey(JOURNEY)
    .pyramid(2, { difficulty: TIER, ...pyramid })
    .floor(0, { pathPuzzles: 2, ...floor })
    .floor(1, { pathPuzzles: 2 }),
]

describe("shape knobs authored in the DSL", () => {
  it("a pyramid's spread reaches every floor's config, a floor's own wins", () => {
    const floors = floorsOf(twoFloors({ spread: 0.8 }, { spread: 0.1 }))
    expect(floors.map(f => f.spread)).toEqual([0.1, 0.8])
  })

  it("a pyramid's plan reaches every floor's config, a floor's own wins", () => {
    const floors = floorsOf(twoFloors({ plan: "spiral" }, { plan: "meander" }))
    expect(floors.map(f => f.plan)).toEqual(["meander", "spiral"])
  })

  it("a pyramid's corridorWidth reaches every floor's config", () => {
    const floors = floorsOf(twoFloors({ corridorWidth: 2 }, {}))
    expect(floors.map(f => f.corridorWidth)).toEqual([2, 2])
  })

  it("an unauthored knob leaves the config without the field", () => {
    const [floor] = floorsOf(twoFloors({}, {}))
    expect([floor.plan, floor.spread, floor.corridorWidth, floor.wideByIndex]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })

  it("a node selector's width marks that node's room wideWayIn", () => {
    const [floor] = floorsOf(twoFloors({}, { nodes: [{ where: 2, width: 2 }] }))
    expect(floor.wideByIndex).toEqual({ 1: true })
    const state = firstCarved(
      prepOf(plainFloor({ pathPuzzles: 2, exitOrStaircase: "exit", wideByIndex: floor.wideByIndex }))
    )
    const puzzles = [...state.mainRooms!.values()].filter(room => room.pathIndex !== undefined)
    expect(puzzles.map(room => room.wideWayIn)).toEqual([undefined, true])
  })

  it("a side path's node width reaches its section config", () => {
    const rules = twoFloors({}, { sideSections: [sidePath({ puzzles: 2, nodes: [{ where: "last", width: 2 }] })] })
    const [floor] = floorsOf(rules)
    expect(floor.sideSections[0].wideByIndex).toEqual({ 1: true })
  })
})
