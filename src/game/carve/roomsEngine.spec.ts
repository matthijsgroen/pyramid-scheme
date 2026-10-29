import { describe, expect, it } from "vitest"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "../floorLockWalk"
import { lessonOrderFaults } from "../lessonOrder"
import { parseLock } from "../lockNotation"
import { parsePrefab } from "../prefabNotation"
import { decorationFootprint, type DecorationKind, type FloorConfig, type FloorGrid } from "../siteTypes"
import { BINDING } from "../testSupport/lockFixtures"
import { assembleFloor } from "./assembleFloor"
import { plainFloor } from "./carveFixtures"
import { ROOMS_ENGINE } from "./engines"

// MADE-UP LOCKS AND ROOMS, never catalogue ones: `yarn lock` checks the catalogue.

/** A lever in the side room opens the door on the way out, which the hall shows first. */
const LEVER_IN_THE_SIDE = "in -- hall\nhall -[H]- out\nhall -- side\nH toggle @side\nin ?\nhall ?\nout ?\nside ?"

/** A lever with two ways to the hall: straight through one door, or round by the side room through the other. */
const ROUND_THE_SIDE =
  "in -[L]- hall\nhall -- out\nin -- side\nside -[L:a]- hall\nL toggle @in\nin ?\nhall ?\nout ?\nside ?"

const footprintOf = (kind: DecorationKind) =>
  kind === "mat" ? { cols: 1, rows: 1, tall: 0, ground: true as const } : decorationFootprint(kind)

const STUDY = parsePrefab(
  `tier starter
room study
layout
# # d # #
# p . . #
d . . . d
# . . s #
# # d # #
p floor pillar
s stop`,
  "room",
  footprintOf
)

/** The floor carved by the rooms engine at the first of twelve seeds that carves it. */
const carveInRooms = (config: FloorConfig): FloorGrid => {
  const refused: unknown[] = []
  for (let n = 1; n <= 12; n++) {
    const result = assembleFloor("test", config, n * 7919, undefined, {}, { engine: ROOMS_ENGINE })
    if (result.success) return result.grid
    refused.push(result.reasons)
  }
  throw new Error(`carved at none of 12 seeds: ${JSON.stringify(refused[0])}`)
}

const lockFloor = (text: string, name: string): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: parseLock(text, name).lock }],
  realisations: BINDING,
})

/** The rooms off the lattice's even/even nodes: none on a floor carved on the lattice. */
const roomsOffTheLattice = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) => row.filter((cell, c) => cell.type === "room" && (r % 2 !== 0 || c % 2 !== 0)))

describe("the rooms engine", () => {
  it("rooms engine carves a made-up lock floor and its lock walk passes", () => {
    const grid = carveInRooms(lockFloor(ROUND_THE_SIDE, "roundTheSide"))
    expect(roomsOffTheLattice(grid).length).toBeGreaterThan(0)
    const walk = walkFloorLock(grid)!
    if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
    expect(deadFloorRegions(grid)).toEqual([])
  })

  it("its lesson order holds", () => {
    const grid = carveInRooms(lockFloor(LEVER_IN_THE_SIDE, "leverInTheSide"))
    expect(roomsOffTheLattice(grid).length).toBeGreaterThan(0)
    expect(lessonOrderFaults(grid)).toEqual([])
  })

  it("a pinned prefab stands at its node", () => {
    const grid = carveInRooms(plainFloor({ pathPuzzles: 2, prefabs: { study: STUDY }, prefabsByIndex: { 1: "study" } }))
    const pinned = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "room" && cell.pinnedPrefab === "study" ? [{ cell, r, c }] : []))
    )
    expect(pinned).toHaveLength(1)
    const [{ cell, r, c }] = pinned
    const room = cell.type === "room" ? cell.prefabRoom : undefined
    expect(room?.name).toBe("study")
    const { top, left, rows, cols } = room!.rect
    expect(r >= top && r < top + rows && c >= left && c < left + cols).toBe(true)
    expect(roomsOffTheLattice(grid).length).toBeGreaterThan(0)
  })
})
