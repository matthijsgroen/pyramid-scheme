import { describe, expect, it } from "vitest"
import { journey, sidePath } from "./dsl"
import type { Rule } from "./dsl"
import { resolvePyramidConstraint } from "./constraintResolver"
import { buildSite } from "./buildSite"
import { assembleFloor, defaultResolveEncounter } from "../game/siteAssembler"
import type { ResolveEncounter } from "../game/siteAssembler"
import type { Direction, FloorConfig as GameFloorConfig, FloorGrid, RoomCell } from "../game/siteTypes"

// The stem a spec file would hand-author. Every key id this file expects is built from THIS
// constant, never from the builder's own output, so a stem the pipeline invented would not match.
const SWITCH_STEM = "spec:switch"
const JOURNEY = "spec_switch_journey"
const TIER = "junior"
const LEVEL_COUNT = 4
// 1-based, the way the DSL's pyramid selector is written.
const PYRAMID = 2

// Authored exactly as a world spec file authors a floor: a journey-pyramid rule with a chained
// .floor(), which is the only shape whose FloorConstraint the pyramid pipeline reads back.
const specRules: Rule[] = [
  journey(JOURNEY)
    .pyramid(PYRAMID, { difficulty: TIER })
    .floor(0, {
      pathPuzzles: 2,
      switchFork: { encounter: "sumplete", keyId: SWITCH_STEM },
      sideSections: [sidePath({ puzzles: 1 }), sidePath({ puzzles: 1 })],
    }),
]

// The same two steps configBuilder's pyramid phase takes: resolve the rules for one pyramid, then
// hand the resolved constraint to buildSite.
const builtFloors = () =>
  buildSite({
    journeyId: JOURNEY,
    tier: TIER,
    pyramidIndex: PYRAMID - 1,
    levelCount: LEVEL_COUNT,
    pathPuzzles: 2,
    constraint: resolvePyramidConstraint(specRules, JOURNEY, TIER, PYRAMID - 1, LEVEL_COUNT),
    difficulty: TIER,
    hasMapPieceBranch: false,
    hasWardGate: false,
    nextTier: null,
    resolveReward: () => undefined,
    resolveMainEndReward: () => ({ type: "mosaicPiece" }),
  }).floors

// Whether a finished room is walked back into is the family registry's answer, and core world-gen
// assembles without the registry; a switch is refused outright unless its family offers the walk
// back, so the stub grants it.
const reEnterableFamilies: ResolveEncounter = (encounter, defaultTag) => ({
  ...defaultResolveEncounter(encounter, defaultTag),
  reEnterable: true,
})

const findSwitch = (grid: FloorGrid): { r: number; c: number; cell: RoomCell } | undefined => {
  for (let r = 0; r < grid.cells.length; r++) {
    for (let c = 0; c < grid.cells[r].length; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.roomType === "fork" && cell.family !== undefined) return { r, c, cell }
    }
  }
  return undefined
}

// Which junction a carve offers is the seed's choice, so seeds are tried until one carves the
// authored switch — and the throw is the failure, never a silent skip.
const assembledSwitch = () => {
  // worldGen's FloorConfig is a slightly looser mirror of game/siteTypes.ts's, and authored data only
  // ever assigns values the stricter type accepts too — the same cast reachability.ts makes here.
  const floor = builtFloors()[0] as GameFloorConfig
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor(`${JOURNEY}:${PYRAMID}`, floor, seed, reEnterableFamilies)
    if (!result.success) continue
    const at = findSwitch(result.grid)
    if (at) return { ...at, grid: result.grid }
  }
  throw new Error("no seed carved the authored switch")
}

const DIR_MOVE: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

const gatedExitsOf = (grid: FloorGrid, at: { r: number; c: number; cell: RoomCell }) =>
  (at.cell.exits ?? [])
    .filter(exit => exit.gateKeyId !== undefined)
    .map(exit => {
      const [dr, dc] = DIR_MOVE[exit.dir]
      return { exit, beyond: grid.cells[at.r + dr * 2]?.[at.c + dc * 2] }
    })

describe("a switch fork authored in the DSL", () => {
  it("reaches the built floor config with the stem the rule named", () => {
    expect(builtFloors()[0].switchFork).toEqual({ encounter: "sumplete", keyId: SWITCH_STEM })
  })

  it("stands the authored encounter in a fork room", () => {
    const { cell } = assembledSwitch()
    expect(cell.roomType).toBe("fork")
    expect(cell.family).toBe("sumplete")
  })

  it("closes at least two of that fork's ways out", () => {
    const { grid } = assembledSwitch()
    const at = findSwitch(grid)!
    expect(gatedExitsOf(grid, at).length).toBeGreaterThanOrEqual(2)
  })

  it("keys each closed way out on the authored stem and the section it reaches", () => {
    const { grid } = assembledSwitch()
    const at = findSwitch(grid)!
    const gated = gatedExitsOf(grid, at)
    expect(gated.length).toBeGreaterThanOrEqual(2)
    for (const { exit, beyond } of gated) {
      expect(beyond?.type).toBe("room")
      const address = beyond?.type === "room" ? beyond.sectionAddress : undefined
      expect(address).toBeTruthy()
      expect(exit.gateKeyId).toBe(`${SWITCH_STEM}:${address}`)
      expect(beyond?.type === "room" && beyond.requiredKeyId).toBe(`${SWITCH_STEM}:${address}`)
      expect(beyond?.type === "room" && beyond.gateVariant).toBe("floor-key")
    }
  })

  it("gives each closed way out its own key, so the choice decides something", () => {
    const { grid } = assembledSwitch()
    const at = findSwitch(grid)!
    const keyIds = gatedExitsOf(grid, at).map(({ exit }) => exit.gateKeyId)
    expect(new Set(keyIds).size).toBe(keyIds.length)
    expect(keyIds.length).toBeGreaterThanOrEqual(2)
  })
})
