import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import { adjacencyFaults } from "./carveAgreement"
import { expandFloorLocks } from "./floorLocks"
import { compileLock } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { deadFloorRegions, describeFloorWalkFailure, walkFloorLock } from "./floorLockWalk"
import { BINDING, carveLockFloor } from "./testSupport/lockFixtures"
import { stoneFloor } from "./testSupport/stoneFixtures"
import type { Direction, FloorConfig, FloorGrid } from "./siteTypes"

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

/** A fork whose two ways meet again beyond it. */
const ARMS_REJOIN = "in -[Y]- a\nin -[Y]- b\na -- b\nin -- out\nY fork @in\nin ?\na ?\nb ?\nout ?"

describe("a fork whose two ways meet again", () => {
  it("carves its junction with a gated exit on each way, and walks sound", () => {
    const grid = carveLockFloor(parseLock(ARMS_REJOIN, "armsRejoin").lock, BINDING)
    const junction = grid.cells.flat().find(cell => cell.type === "room" && cell.mechanismId === "armsRejoin.Y")
    expect(junction?.type === "room" && junction.exits?.filter(exit => exit.gateKeyId !== undefined)).toHaveLength(2)
    expectSound(grid)
  })
})

const OPPOSITE = { n: "s", s: "n", e: "w", w: "e" } as const

/** The grid with its first empty cell beside two corridors of one region made a corridor of that region, joined to
 * both: a loop inside that region. Undefined where no empty cell stands beside two corridors of one region. */
const withRegionLoop = (grid: FloorGrid): FloorGrid | undefined => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      if (grid.cells[r][c].type !== "empty") continue
      const beside = (["n", "s", "e", "w"] as Direction[]).flatMap(dir => {
        const [nr, nc] = [r + STEP[dir][0], c + STEP[dir][1]]
        const cell = grid.cells[nr]?.[nc]
        return cell?.type === "corridor" && cell.region !== undefined ? [{ dir, nr, nc, cell }] : []
      })
      const first = beside.find(one => beside.some(other => other !== one && other.cell.region === one.cell.region))
      if (!first) continue
      const second = beside.find(other => other !== first && other.cell.region === first.cell.region)!
      const cells = grid.cells.map(row => [...row])
      cells[r][c] = { ...first.cell, dirs: new Set([first.dir, second.dir]) }
      for (const { dir, nr, nc, cell } of [first, second])
        cells[nr][nc] = { ...cell, dirs: new Set([...cell.dirs, OPPOSITE[dir]]) }
      return { ...grid, cells }
    }
  return undefined
}

const SIMPLE = "in -- hall\nhall -[L]- out\nL toggle @in\nin ?\nhall ?\nout ?"
const configOf = (text: string, name: string) => ({
  pathPuzzles: 0,
  difficulty: "expert" as const,
  end: "treasure" as const,
  exitOrStaircase: "exit" as const,
  sideSections: [],
  realisations: BINDING,
  locks: [{ lock: parseLock(text, name).lock }],
})

describe("a loop inside one region", () => {
  it.each([
    [
      "laid from a lock",
      () => carveLockFloor(parseLock(ROUND_THE_SIDE, "roundTheSide").lock, BINDING),
      ROUND_THE_SIDE,
      "roundTheSide",
    ],
    [
      "carved as side chains",
      () => {
        // The same lock written longhand: its own expansion, with no `locks` left, which the side-chain carve takes.
        const expanded = expandFloorLocks(configOf(SIMPLE, "simple"))
        if (!expanded.ok) throw new Error(JSON.stringify(expanded.reasons))
        return carveAtTwelveSeeds(expanded.config)
      },
      SIMPLE,
      "simple",
    ],
  ] as const)("is fine on a floor %s: no adjacency fault, and the walk is unchanged", (_, carve, text, name) => {
    const grid = carve()
    const looped = withRegionLoop(grid)
    if (!looped) throw new Error("no empty cell stands beside two corridors of one region")
    const expanded = expandFloorLocks(configOf(text, name))
    if (!expanded.ok) throw new Error(JSON.stringify(expanded.reasons))
    const layout = expanded.config.regionLayout!
    expect(adjacencyFaults(looped.cells, layout)).toEqual(adjacencyFaults(grid.cells, layout))
    expectSound(looped)
    expect(walkFloorLock(looped)).toEqual(walkFloorLock(grid))
  })
})
