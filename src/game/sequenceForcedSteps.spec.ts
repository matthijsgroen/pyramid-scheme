import { describe, expect, it } from "vitest"
import { refusal } from "@/worldGen/carveSeedSearch"
import { assembleFloor } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "./siteTypes"
import { floorLock, regionsOf } from "./floorLock"
import { entering, reachableStates, type LockState } from "./lockWalk"
import { walkFloorLock } from "./floorLockWalk"
import { progressState, spoiledState } from "./sequence"
import { walkPresses } from "./sequencePlay"
import { cellAddress } from "./cellAddress"
import { hallAnnexSequenceFloor, offRouteSequenceFloor, oneRegionSequenceFloor } from "./testSupport/sequenceFixtures"

const SEEDS = Array.from({ length: 40 }, (_, n) => (n + 1) * 7919)
const TIMEOUT = 120_000
const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const key = (r: number, c: number) => `${r},${c}`

// minSound is the least of 40 seeds that carve and walk sound; carving 40, 40 and 32 of them, these walked
// sound on 16, 28 and 16; with tiles seated
// at random among the cuts, on 6, 28 and 9.
const FLOORS: { name: string; make: () => FloorConfig; minSound: number }[] = [
  { name: "tiles in the hall, an annex and the hall again", make: hallAnnexSequenceFloor, minSound: 10 },
  { name: "all tiles in one region", make: oneRegionSequenceFloor, minSound: 15 },
  { name: "tiles spread across off-route regions", make: offRouteSequenceFloor, minSound: 12 },
]

const carved = (make: () => FloorConfig): FloorGrid[] =>
  SEEDS.flatMap(seed => {
    const result = assembleFloor("test", make(), seed)
    return result.success ? [result.grid] : []
  })

const tilesOf = (grid: FloorGrid) =>
  grid.cells
    .flatMap((row, r) => row.flatMap((cell, c) => (cell.type === "room" && cell.sequenceTile ? [{ r, c, cell }] : [])))
    .sort((a, b) => a.cell.sequenceTile!.step - b.cell.sequenceTile!.step)

const isDoor = (cell: GridCell) => cell.type === "room" && cell.requiredKeyId !== undefined

// The ground, read independently of the production walk: cells joined where both name the way, the
// cells in `without` left out, and a door a wall unless `doorsOpen`.
const flood = (grid: FloorGrid, from: readonly [number, number], without: ReadonlySet<string>, doorsOpen: boolean) => {
  const seen = new Set<string>(without)
  const reached = new Set<string>()
  const queue: [number, number][] = [[from[0], from[1]]]
  seen.add(key(...from))
  for (let at = 0; at < queue.length; at++) {
    const [r, c] = queue[at]
    reached.add(key(r, c))
    const cell = grid.cells[r][c]
    if (cell.type !== "room" && cell.type !== "corridor") continue
    for (const dir of cell.dirs as ReadonlySet<Direction>) {
      const [nr, nc] = [r + MOVES[dir][0], c + MOVES[dir][1]]
      const next = grid.cells[nr]?.[nc]
      if (!next || (next.type !== "room" && next.type !== "corridor") || seen.has(key(nr, nc))) continue
      if (next.hidden || (next.type === "corridor" && next.obstacle)) continue
      if (!(next.dirs as ReadonlySet<Direction>).has(dir === "n" ? "s" : dir === "s" ? "n" : dir === "e" ? "w" : "e"))
        continue
      if (!doorsOpen && isDoor(next)) continue
      seen.add(key(nr, nc))
      queue.push([nr, nc])
    }
  }
  return reached
}

describe.each(FLOORS)("forced steps over $name", ({ make, minSound }) => {
  const grids = carved(make)

  it(
    "carves on most seeds and walks sound on a fair share of them",
    () => {
      expect(grids.length).toBeGreaterThanOrEqual(25)
      expect(grids.filter(grid => walkFloorLock(grid)?.sound).length).toBeGreaterThanOrEqual(minSound)
    },
    TIMEOUT
  )

  it(
    "stands every tile on a cell whose two sides nothing joins without it",
    () => {
      for (const grid of grids)
        for (const { r, c, cell } of tilesOf(grid)) {
          const [a, b] = [...(cell.dirs as ReadonlySet<Direction>)].map(
            dir => [r + MOVES[dir][0], c + MOVES[dir][1]] as [number, number]
          )
          expect(cell.dirs.size).toBe(2)
          expect(flood(grid, a, new Set([key(r, c)]), true).has(key(...b))).toBe(false)
        }
    },
    TIMEOUT
  )

  it(
    "compiles every tile as a region of its own, so no flood runs across it",
    () => {
      for (const grid of grids) {
        const { of } = regionsOf(grid)
        const regions = tilesOf(grid).map(({ r, c }) => of.get(key(r, c)))
        expect(new Set(regions).size).toBe(regions.length)
        for (const region of regions) expect([...of.values()].filter(id => id === region)).toHaveLength(1)
      }
    },
    TIMEOUT
  )

  it(
    "makes the walk enter a tile before the ground beyond it, and the entry works the sequence as a press does",
    () => {
      for (const grid of grids) {
        const lock = floorLock(grid)!
        const { of } = regionsOf(grid)
        const [home] = tilesOf(grid)
        const id = `obstacle ${home.r},${home.c}`
        const found = reachableStates(lock)
        if (found === "tooLarge") throw new Error("too large")
        const cellsOf = (region: string) => [...of.entries()].filter(([, id]) => id === region).map(([place]) => place)
        const entrance = grid.entrancePos
        for (const [step, { r, c }] of tilesOf(grid).entries()) {
          const beyond = new Set(
            [...of.keys()].filter(place => !flood(grid, entrance, new Set([key(r, c)]), true).has(place))
          )
          beyond.delete(key(r, c))
          const tile = of.get(key(r, c))!
          const isBeyond = (region: string) => cellsOf(region).every(place => beyond.has(place))
          found.edges.forEach((tos, from) =>
            tos.forEach(to => {
              const [before, after] = [found.order[from], found.order[to]]
              if (before.region === after.region) return
              if (isBeyond(after.region) && !isBeyond(before.region))
                expect(before.region, `into ${after.region}`).toBe(tile)
              if (after.region !== tile) return
              const was = before.config[id]
              const expected = was === progressState(step) ? progressState(step + 1) : spoiledOrSame(was, step)
              expect(after.config[id], `${was} onto tile ${step}`).toBe(expected)
            })
          )
        }
      }
    },
    TIMEOUT
  )

  it(
    "refuses a floor no walk walks sound, and passes one that does",
    () => {
      let unsound = 0
      let kept = 0
      for (const grid of grids) {
        const walk = walkFloorLock(grid)!
        const refused = refusal({ success: true, grid, attempt: 0 })
        if (walk.sound) {
          kept++
          expect(refused).toBeNull()
        } else {
          unsound++
          expect(refused?.criterion).toBe("lock walks sound")
        }
      }
      expect(kept).toBeGreaterThan(0)
      expect(unsound).toBeGreaterThan(0)
    },
    TIMEOUT
  )

  it(
    "agrees with the runtime: the same crossings leave the sequence in the same state",
    () => {
      let replayed = 0
      for (const grid of grids) {
        const lock = floorLock(grid)!
        const { of } = regionsOf(grid)
        const tiles = tilesOf(grid)
        const [home] = tiles
        const id = `obstacle ${home.r},${home.c}`
        const address = cellAddress(grid, 0, home.r, home.c)!
        const lit: FloorGrid = {
          ...grid,
          cells: grid.cells.map(row =>
            row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
          ),
        }
        // Routes visit the tiles in every order of up to four tiles, joined by the shortest ground walks.
        const orders: number[][] = [
          [0, 1, 2],
          [2, 1, 0],
          [1, 0, 2],
          [0, 2, 1],
          [0, 0, 1, 2],
          [1, 2, 0, 1],
        ].filter(order => order.every(step => step < tiles.length))
        for (const order of orders) {
          const path: [number, number][] = [[grid.entrancePos[0], grid.entrancePos[1]]]
          let blocked = false
          for (const step of order) {
            const from = path[path.length - 1]
            const to: [number, number] = [tiles[step].r, tiles[step].c]
            const leg = shortest(grid, from, to)
            if (!leg) blocked = true
            else path.push(...leg.slice(1))
          }
          if (blocked || path.some(([r, c]) => isDoor(grid.cells[r][c]))) continue
          replayed++

          const writes = walkPresses(lit, 0, path, new Map())
          let state: LockState = { region: of.get(key(...path[0]))!, config: { [id]: progressState(0) } }
          for (const [r, c] of path.slice(1)) {
            const region = of.get(key(r, c))!
            if (region === state.region) continue
            state = entering(lock, state.region, { region, config: state.config })
          }
          expect(writes.at(-1)?.address ?? address).toBe(address)
          expect(state.config[id]).toBe(writes.at(-1)?.state ?? progressState(0))
        }
      }
      expect(replayed).toBeGreaterThan(0)
    },
    TIMEOUT
  )
})

const spoiledOrSame = (was: string, step: number): string => {
  const walked = /^\d+$/.exec(was) ? Number(was) : undefined
  return walked !== undefined && walked < step ? spoiledState(walked, step) : was
}

const shortest = (
  grid: FloorGrid,
  from: readonly [number, number],
  to: readonly [number, number]
): [number, number][] | undefined => {
  const parent = new Map<string, string>([[key(...from), ""]])
  const queue: [number, number][] = [[from[0], from[1]]]
  for (let at = 0; at < queue.length; at++) {
    const [r, c] = queue[at]
    if (r === to[0] && c === to[1]) {
      const path: [number, number][] = []
      for (let k: string | undefined = key(r, c); k; k = parent.get(k))
        path.unshift(k.split(",").map(Number) as [number, number])
      return path
    }
    const cell = grid.cells[r][c]
    if (cell.type !== "room" && cell.type !== "corridor") continue
    for (const dir of cell.dirs as ReadonlySet<Direction>) {
      const [nr, nc] = [r + MOVES[dir][0], c + MOVES[dir][1]]
      const next = grid.cells[nr]?.[nc]
      if (!next || (next.type !== "room" && next.type !== "corridor") || parent.has(key(nr, nc))) continue
      if (next.hidden || (next.type === "corridor" && next.obstacle)) continue
      parent.set(key(nr, nc), key(r, c))
      queue.push([nr, nc])
    }
  }
  return undefined
}

describe("a floor on which no walk keeps the order", () => {
  it(
    "is refused before it is baked, naming the sequence",
    () => {
      const unkept = carved(oneRegionSequenceFloor).filter(grid => {
        const walk = walkFloorLock(grid)
        return walk && !walk.sound && walk.failure.type === "goalUnreachable"
      })
      expect(unkept.length).toBeGreaterThan(0)
      for (const grid of unkept) {
        const refused = refusal({ success: true, grid, attempt: 0 })
        expect(refused?.criterion).toBe("lock walks sound")
        expect(refused?.detail).toContain("sequence plates")
      }
    },
    TIMEOUT
  )
})
