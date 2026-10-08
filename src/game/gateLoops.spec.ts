import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import { compileLock } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import { BINDING, carveLockFloor } from "./testSupport/lockFixtures"
import { stoneFloor } from "./testSupport/stoneFixtures"
import type { FloorConfig, FloorGrid } from "./siteTypes"

// MADE-UP LOCKS WHOSE GATED JOINS CLOSE A LOOP, never catalogue ones: a test pins the rule, `yarn run lock` checks
// the catalogue. Every region takes `free`, so the floor holds the lock and nothing else.

/** A lever with two ways to the hall: straight through one door, or round by the side room through the other. */
const ROUND_THE_SIDE =
  "in -[L]- hall\nhall -- out\nin -- side\nside -[L:a]- hall\nL toggle @in\nin ?\nhall ?\nout ?\nside ?"

/** ROUND_THE_SIDE with two barriers on the join that closes the loop: the lever's door, then a torch's. */
const ORDERED_LOOP =
  "in -[L]- hall\nhall -- out\nin -- side\nside -[L:a]- -[T]- hall\nL toggle @in\nT activator @in\nin ?\nhall ?\nout ?\nside ?"

/** A stone on the room's plate holds the way in open; lifted, it opens the way back round by `back`. */
const ROUND_THE_ROOM =
  "in -- hall\nhall -[p]- room\nroom -- back\nback -[p:empty]- hall\nhall -- out\np plate @room stone\nin ?\nhall ?\nroom ?\nback ?\nout ?"

const STEP = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const

/** The floor carved at the first of twelve seeds that carves it. */
const carveAtTwelveSeeds = (config: FloorConfig): FloorGrid => {
  const refused: unknown[] = []
  for (let n = 1; n <= 12; n++) {
    const result = assembleFloor("test", config, n * 7919)
    if (result.success) return result.grid
    refused.push(result.reasons)
  }
  throw new Error(`carved at none of 12 seeds: ${JSON.stringify(refused[0])}`)
}

/** A stone lock carved at the first of twelve seeds that carves it. */
const carveStones = (text: string): FloorGrid => carveAtTwelveSeeds(stoneFloor(text))

const doorCells = (grid: FloorGrid) =>
  grid.cells.flat().filter(cell => cell.type === "room" && cell.requiredKeyId !== undefined)

/** The first of `ids` whose door a walk from a cell of the authored region `label` meets, passing through no door. */
const firstDoorFrom = (grid: FloorGrid, label: string, ids: readonly string[]): string | undefined => {
  const isDoor = (r: number, c: number) => {
    const cell = grid.cells[r]?.[c]
    return cell?.type === "room" && cell.requiredKeyId !== undefined
  }
  const queue: [number, number][] = []
  const seen = new Set<string>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if ((cell.type === "room" || cell.type === "corridor") && cell.region === label && !isDoor(r, c)) {
        queue.push([r, c])
        seen.add(`${r},${c}`)
      }
    })
  )
  for (let at = 0; at < queue.length; at++) {
    const [r, c] = queue[at]
    const cell = grid.cells[r][c]
    if (isDoor(r, c)) {
      const found = ids.find(id => cell.type === "room" && cell.requiredKeyId!.endsWith(`:${id}`))
      if (found) return found
      continue
    }
    if (cell.type !== "room" && cell.type !== "corridor") continue
    for (const dir of cell.dirs) {
      const [nr, nc] = [r + STEP[dir][0], c + STEP[dir][1]]
      if (!grid.cells[nr]?.[nc] || seen.has(`${nr},${nc}`)) continue
      seen.add(`${nr},${nc}`)
      queue.push([nr, nc])
    }
  }
  return undefined
}

const expectSound = (grid: FloorGrid) => {
  const walk = walkFloorLock(grid)!
  if (!walk.sound) throw new Error(describeFloorWalkFailure(walk.failure))
  expect(deadFloorRegions(grid)).toEqual([])
}

describe("a lock whose gates close a loop", () => {
  it("carves with a door on each way to the hall, and walks sound", () => {
    const grid = carveLockFloor(parseLock(ROUND_THE_SIDE, "roundTheSide").lock, BINDING)
    expect(doorCells(grid)).toHaveLength(2)
    expectSound(grid)
  })

  // D5: the carve stands each obstacle anywhere along its corridor, in the order the corridor carries them.
  it("keeps the order of two obstacles on the join that closes the loop", () => {
    const grid = carveLockFloor(parseLock(ORDERED_LOOP, "orderedLoop").lock, BINDING)
    expectSound(grid)
    const both = ["orderedLoop.side-hall", "orderedLoop.side-hall#2"]
    expect(firstDoorFrom(grid, "orderedLoop.side", both)).toBe("orderedLoop.side-hall")
    expect(firstDoorFrom(grid, "orderedLoop.hall", both)).toBe("orderedLoop.side-hall#2")
  })

  it("carves a stone's two doors on one loop, and walks the stone round and back", () => {
    const grid = carveStones(ROUND_THE_ROOM)
    expect(doorCells(grid)).toHaveLength(2)
    expectSound(grid)
  })
})

/** One door with an open way round it. */
const OPEN_WAY_ROUND = "in -[L]- hall\nhall -- out\nin -- side\nside -- hall\nL toggle @in\nin ?\nhall ?\nout ?\nside ?"

describe("a gate an open loop goes round", () => {
  it("is refused by name before a wall is carved", () => {
    const result = compileLock(parseLock(OPEN_WAY_ROUND, "openWayRound").lock, BINDING)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.faults).toContainEqual({
      type: "topology",
      fault: { type: "gateBypassed", id: "in-hall", between: ["in", "hall"] },
    })
  })
})
