import { describe, expect, it } from "vitest"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import type { PlacedLock } from "./floorLocks"
import { describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import { assembleFloor } from "./siteAssembler"
import type { FloorConfig, FloorGrid, RoomCell } from "./siteTypes"
import { leverLock } from "./testSupport/floorLockFixtures"
import { BINDING } from "./testSupport/lockFixtures"

// A lever lock spliced into the nest spot of another, as nestedLocks.spec.ts carves it.
const leverInLever: PlacedLock[] = [
  { lock: leverLock() },
  { lock: leverLock(), as: "inner", inside: { instance: "lever" } },
]
const config: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: BINDING,
  locks: leverInLever,
}

const grids = (): FloorGrid[] =>
  Array.from({ length: 12 }, (_, n) =>
    assembleFloor("nested-web", config, n + 1, resolveEncounterMeta, {
      resolveKeyRequirements,
      floorRef: { journeyId: "nested-web", floorIndex: 0 },
    })
  ).flatMap(result => (result.success ? [result.grid] : []))

/** The grid with `key` added to the door each listed lock's lever opens. */
const withWebKey = (grid: FloorGrid, key: string, locks: string[]): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map(cell => {
      if (cell.type !== "room" || !cell.requiredKeyId) return cell
      const lock = locks.find(name => cell.requiredKeyId!.endsWith(`:${name}.hallDoor`))
      return lock ? ({ ...cell, requiredKeyIds: [...(cell.requiredKeyIds ?? []), key] } as RoomCell) : cell
    })
  ),
})

const doorsAsking = (grid: FloorGrid, key: string) =>
  grid.cells.flat().filter(cell => cell.type === "room" && cell.requiredKeyIds?.includes(key)).length

describe("a web key on a floor with a nested lock", () => {
  it("walks one standing on the nested lock's own door", () => {
    const carved = grids()
    expect(carved.length).toBeGreaterThan(0)
    for (const grid of carved) {
      const keyed = withWebKey(grid, "web:sun", ["inner"])
      expect(doorsAsking(keyed, "web:sun")).toBe(1)
      const walk = walkFloorLock(keyed)!
      if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
    }
  })

  it("refuses one whose doors stand in the nested lock and its host: the two would walk its arrival apart", () => {
    for (const grid of grids()) {
      const keyed = withWebKey(grid, "web:sun", ["inner", "lever"])
      expect(doorsAsking(keyed, "web:sun")).toBe(2)
      const walk = walkFloorLock(keyed)
      expect(walk).toEqual({
        sound: false,
        failure: { type: "entangled", problem: "outside web:sun belongs to more than one lock" },
      })
    }
  })
})
