import { describe, expect, it } from "vitest"
import {
  diamond,
  freshState,
  leverOpening,
  noLabels,
  plainFloor,
  prepOf,
  straightWalk,
  isPuzzleRoom,
  isTrapRoom,
} from "./carveFixtures"
import { makePkey } from "./grid"
import { gateKeyOf } from "./ids"
import { isolate } from "./isolate"
import { assembleFloor } from "./assembleFloor"
import type { Chain, FloorPrep } from "./state"
import type { Direction, FloorConfig, FloorGrid } from "../siteTypes"
const chainOf = (prep: FloorPrep, positional: string, doors: string[], cells: Chain["cells"]): Chain => ({
  section: prep.sections.sideSections[0],
  cells,
  attachedAt: [0, 2],
  positional,
  idx: 0,
  doors,
  hidden: false,
  keyHostColors: [],
})

describe("isolate", () => {
  const prep = prepOf(
    plainFloor({
      regionLayout: diamond,
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      obstacles: [{ id: "bars", kind: "gate", at: { on: "connection", between: ["rightLower", "s1Chamber"] } }],
      controls: [leverOpening(["bars"], "lever", "entrance")],
    })
  )
  const isolated = (chains: Chain[], regions: [string, string][] = []) => {
    const labels = noLabels()
    for (const [cell, region] of regions) labels.region.set(cell, region)
    const state = {
      ...freshState(prep),
      lay: null,
      maze: straightWalk(3),
      labels,
      keys: { chains, hostColors: new Map() },
    }
    isolate.run(prep, state)
    return state.doors!
  }
  const pkey = makePkey(7)

  it("holds the main path's steps and every chain's walk as intended edges", () => {
    const { intended } = isolated([
      chainOf(
        prep,
        "s0",
        [],
        [
          [2, 2],
          [4, 2],
        ]
      ),
    ])
    expect(intended).toEqual(new Set([pkey(0, 0, 0, 2), pkey(0, 2, 0, 4), pkey(0, 2, 2, 2), pkey(2, 2, 4, 2)]))
  })

  it("stands a chain's cells behind its own door and every ancestor's, and leaves an open chain ungated", () => {
    const { gated, behind } = isolated([
      chainOf(prep, "s0", [], [[2, 2]]),
      chainOf(prep, "s0.0", ["s0", "s0.0"], [[4, 2]]),
    ])
    expect(gated).toEqual(new Set(["4,2"]))
    expect(behind.get("4,2")).toEqual(new Set(["s0", "s0.0"]))
  })

  it("stands a cell of a gated region behind the gate bounding it, and every region behind its seams", () => {
    const { behind, seamBehind } = isolated(
      [],
      [
        ["2,2", "rightLower"],
        ["4,2", "s1Chamber"],
      ]
    )
    expect(behind.get("4,2")).toEqual(new Set([gateKeyOf(prep.input.floorRef, "bars")]))
    expect(behind.has("2,2")).toBe(false)
    expect(seamBehind.get("4,2")?.size).toBe(2)
  })
})

describe("carved through assembleFloor", () => {
  it("gated sections have no back-door — removing the gate room cuts off its whole chain", () => {
    // Reproduces a real bug: a leftover edge from buildMaze's whole-grid spanning tree
    // (see the "Gate isolation" comment in carve/isolate.ts) could connect a gated
    // section's interior straight back to the ungated backbone or another section,
    // letting a player reach gated content — even the exit — without ever passing
    // the gate. Sweep several seeds/configs; the gate room must be the section's only
    // entrance every time.
    const key = (r: number, c: number) => `${r},${c}`
    const DIR_MOVE_ALL: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const reachableFrom = (grid: FloorGrid, start: readonly [number, number], blocked: Set<string>) => {
      const seen = new Set<string>([key(...start)])
      const queue: Array<[number, number]> = [[start[0], start[1]]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE_ALL[dir]
          const nr = r + dr,
            nc = c + dc
          const k = key(nr, nc)
          if (seen.has(k) || blocked.has(k)) continue
          seen.add(k)
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const config = (): FloorConfig => ({
      pathPuzzles: 3,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "staircase", gate: { type: "tomb-key", wardKeyId: "w" } },
        { pathPuzzles: 2, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
        {
          pathPuzzles: 1,
          difficulty: "starter",
          end: "treasure",
          sideSections: [{ pathPuzzles: 1, difficulty: "junior", end: "treasure", gate: { type: "floor-key" } }],
        },
      ],
    })

    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("gate-isolation", config(), seed)
      if (!result.success) continue
      const grid = result.grid
      const gates: Array<[number, number]> = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type === "room" && cell.gateVariant) gates.push([r, c])
        }
      expect(gates.length).toBeGreaterThan(0)

      const fullyReachable = reachableFrom(grid, grid.entrancePos, new Set())
      for (const [gr, gc] of gates) {
        const withoutGate = reachableFrom(grid, grid.entrancePos, new Set([key(gr, gc)]))
        const onlyViaThisGate = [...fullyReachable].filter(k => !withoutGate.has(k))
        // More than just the gate cell itself must depend on it — a real chain behind it.
        expect(onlyViaThisGate.length).toBeGreaterThan(1)
      }
    }
  })

  it("sealed sections have no back-door either — removing the first room cuts off the whole chain", () => {
    // Same leftover-spanning-tree-edge risk as gated sections, but for an ungated one: without
    // isolation, a stray door could let a player step past what guards it and still reach the
    // section's reward. This is how a trap gets protected — world-gen writes `sealed` on any section
    // it gives a trap to (placeEncounters), because the assembler no longer reads encounters at all.
    const key = (r: number, c: number) => `${r},${c}`
    const DIR_MOVE_ALL: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const reachableFrom = (grid: FloorGrid, start: readonly [number, number], blocked: Set<string>) => {
      const seen = new Set<string>([key(...start)])
      const queue: Array<[number, number]> = [[start[0], start[1]]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE_ALL[dir]
          const nr = r + dr,
            nc = c + dc
          const k = key(nr, nc)
          if (seen.has(k) || blocked.has(k)) continue
          seen.add(k)
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const config = (): FloorConfig => ({
      pathPuzzles: 3,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "treasure", hidden: true, encounter: "trap", sealed: true },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
      ],
    })

    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("trap-isolation", config(), seed)
      if (!result.success) continue
      const grid = result.grid
      const traps: Array<[number, number]> = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type === "room" && isTrapRoom(cell)) traps.push([r, c])
        }
      if (traps.length === 0) continue

      const fullyReachable = reachableFrom(grid, grid.entrancePos, new Set())
      const [tr, tc] = traps[0]
      const withoutFirstTrap = reachableFrom(grid, grid.entrancePos, new Set([key(tr, tc)]))
      const onlyViaThisTrap = [...fullyReachable].filter(k => !withoutFirstTrap.has(k))
      expect(onlyViaThisTrap.length).toBeGreaterThan(1)
    }
  })

  it("a sealed side section has no back-door either — removing its puzzle room cuts off its whole chain", () => {
    // `sealed` opts an ordinary (visible, ungated) path into the same isolation gate/trapped
    // content already get, so a compact layout can't merge a shortcut around its puzzle room.
    const key = (r: number, c: number) => `${r},${c}`
    const DIR_MOVE_ALL: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const reachableFrom = (grid: FloorGrid, start: readonly [number, number], blocked: Set<string>) => {
      const seen = new Set<string>([key(...start)])
      const queue: Array<[number, number]> = [[start[0], start[1]]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE_ALL[dir]
          const nr = r + dr,
            nc = c + dc
          const k = key(nr, nc)
          if (seen.has(k) || blocked.has(k)) continue
          seen.add(k)
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const config = (): FloorConfig => ({
      // 0 main-path puzzles, so a puzzle room in s0 below is one of the sealed section own rooms.
      pathPuzzles: 0,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "treasure", sealed: true },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
      ],
    })

    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("sealed-isolation", config(), seed)
      if (!result.success) continue
      const grid = result.grid
      const puzzles: Array<[number, number]> = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          // s0 is the sealed section. s1 carries a puzzle too, and an unsealed section is allowed
          // the back door this test exists to forbid, so blocking one of ITS rooms proves nothing.
          if (cell.type === "room" && isPuzzleRoom(cell) && cell.sectionAddress === "s0") puzzles.push([r, c])
        }
      if (puzzles.length === 0) continue

      const fullyReachable = reachableFrom(grid, grid.entrancePos, new Set())
      const [pr, pc] = puzzles[0]
      const withoutFirstPuzzle = reachableFrom(grid, grid.entrancePos, new Set([key(pr, pc)]))
      const onlyViaThisPuzzle = [...fullyReachable].filter(k => !withoutFirstPuzzle.has(k))
      expect(onlyViaThisPuzzle.length).toBeGreaterThan(1)
    }
  })

  it("a sealed main path has no back-door either — removing an early puzzle room cuts off the rest", () => {
    const key = (r: number, c: number) => `${r},${c}`
    const DIR_MOVE_ALL: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const reachableFrom = (grid: FloorGrid, start: readonly [number, number], blocked: Set<string>) => {
      const seen = new Set<string>([key(...start)])
      const queue: Array<[number, number]> = [[start[0], start[1]]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r]?.[c]
        if (!cell || cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE_ALL[dir]
          const nr = r + dr,
            nc = c + dc
          const k = key(nr, nc)
          if (seen.has(k) || blocked.has(k)) continue
          seen.add(k)
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const config = (): FloorConfig => ({
      pathPuzzles: 3,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure" }],
      sealed: true,
    })

    for (let seed = 0; seed < 20; seed++) {
      const result = assembleFloor("sealed-mainpath-isolation", config(), seed)
      if (!result.success) continue
      const grid = result.grid
      const puzzles: Array<[number, number]> = []
      for (let r = 0; r < grid.rows; r++)
        for (let c = 0; c < grid.cols; c++) {
          const cell = grid.cells[r][c]
          if (cell.type === "room" && isPuzzleRoom(cell)) puzzles.push([r, c])
        }
      if (puzzles.length === 0) continue

      const fullyReachable = reachableFrom(grid, grid.entrancePos, new Set())
      const [pr, pc] = puzzles[0]
      const withoutFirstPuzzle = reachableFrom(grid, grid.entrancePos, new Set([key(pr, pc)]))
      const onlyViaThisPuzzle = [...fullyReachable].filter(k => !withoutFirstPuzzle.has(k))
      expect(onlyViaThisPuzzle.length).toBeGreaterThan(1)
    }
  })
})
