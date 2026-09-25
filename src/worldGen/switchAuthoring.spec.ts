import { describe, expect, it } from "vitest"
import { journey, sidePath } from "./dsl"
import type { Rule } from "./dsl"
import { resolvePyramidConstraint } from "./constraintResolver"
import { buildSite } from "./buildSite"
import { assembleFloor, defaultResolveEncounter } from "../game/siteAssembler"
import type { ResolveEncounter } from "../game/siteAssembler"
import type { Direction, FloorConfig as GameFloorConfig, FloorGrid, RoomCell } from "../game/siteTypes"

const JOURNEY = "spec_switch_journey"
const TIER = "junior"
const LEVEL_COUNT = 4
// 1-based, the way the DSL's pyramid selector is written.
const PYRAMID = 2
const FLOOR = 0
// Built from the AUTHORING ADDRESS alone, never from the builder's own output, so a stem the
// pipeline invented some other way would not match. This is the whole claim about the ids: they are
// derivable by anyone holding the authoring, and nothing the carve chose gets into them.
const SWITCH_STEM = `switch:${JOURNEY}#${PYRAMID - 1}#${FLOOR}#0`

// Authored exactly as a world spec file authors a floor: a journey-pyramid rule with a chained
// .floor(), which is the only shape whose FloorConstraint the pyramid pipeline reads back.
const specRules: Rule[] = [
  journey(JOURNEY)
    .pyramid(PYRAMID, { difficulty: TIER })
    .floor(FLOOR, {
      pathPuzzles: 2,
      forks: [{ exits: 2, count: 1 }],
      switches: { encounter: "sumplete", min: 1, max: 1 },
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
    const result = assembleFloor(`${JOURNEY}:${PYRAMID}`, floor, seed, reEnterableFamilies, {
      floorRef: { journeyId: JOURNEY, levelIndex: PYRAMID - 1, floorIndex: FLOOR },
    })
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

describe("forks and switches authored in the DSL", () => {
  it("reach the built floor config as the rule wrote them", () => {
    expect(builtFloors()[0].forks).toEqual([{ exits: 2, count: 1 }])
    expect(builtFloors()[0].switches).toEqual({ encounter: "sumplete", min: 1, max: 1 })
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

  it("keys each closed way out on the floor's authoring address and the section it reaches", () => {
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

  // Two floors of one journey cannot be told apart by journey id and floor index alone, so the level
  // the floor was authored at is in the stem — otherwise a key earned on one pyramid would stand the
  // next pyramid's door open on arrival.
  it("names the level the floor was authored at, so two levels never share a key", () => {
    const floor = builtFloors()[0] as GameFloorConfig
    const stemAt = (levelIndex: number) => {
      for (let seed = 0; seed < 60; seed++) {
        const result = assembleFloor(`${JOURNEY}:${levelIndex}`, floor, seed, reEnterableFamilies, {
          floorRef: { journeyId: JOURNEY, levelIndex, floorIndex: FLOOR },
        })
        if (!result.success) continue
        const keyId = findSwitch(result.grid)?.cell.exits?.find(exit => exit.gateKeyId !== undefined)?.gateKeyId
        // The section the way out reaches is the last segment; the stem is everything before it.
        if (keyId) return keyId.slice(0, keyId.lastIndexOf(":"))
      }
      throw new Error(`no seed carved the authored switch at level ${levelIndex}`)
    }
    expect(stemAt(0)).toBe(`switch:${JOURNEY}#0#${FLOOR}#0`)
    expect(stemAt(1)).toBe(`switch:${JOURNEY}#1#${FLOOR}#0`)
  })
})
