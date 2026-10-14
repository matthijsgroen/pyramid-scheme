import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf, graphDistance, basicConfig } from "./carveFixtures"
import { DIRS2, makePkey } from "./grid"
import { growMaze } from "./growMaze"
import { assembleFloor } from "./assembleFloor"
import type { FloorConfig } from "../siteTypes"
describe("growMaze", () => {
  const prep = prepOf(plainFloor({ pathPuzzles: 3 }))
  const grown = (attempt: number) => {
    const state = { ...freshState(prep, attempt), lay: null }
    growMaze(prep, state)
    return state.maze!
  }

  it("enters from a node on the grid's edge", () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const { n, entrance } = grown(attempt)
      const [r, c] = entrance
      expect([r, c].every(v => v % 2 === 0)).toBe(true)
      expect(r === 0 || c === 0 || r === n - 1 || c === n - 1).toBe(true)
    }
  })

  it("leaves the exit one passage, back along the main path", () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const { n, exit, mainPath, passages } = grown(attempt)
      const pkey = makePkey(n)
      const open = DIRS2.filter(([dr, dc]) => passages.has(pkey(exit[0], exit[1], exit[0] + dr, exit[1] + dc)))
      const [pr, pc] = mainPath[mainPath.length - 2]
      expect(open).toEqual([[pr - exit[0], pc - exit[1]]])
    }
  })
})

describe("carved through assembleFloor", () => {
  it("has an entrance node on the grid edge", () => {
    const result = assembleFloor("site-1", basicConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    const [entR, entC] = result.grid.entrancePos
    const N = result.grid.rows
    const onEdge = entR === 0 || entR === N - 1 || entC === 0 || entC === N - 1
    expect(onEdge).toBe(true)
  })

  it("packing scales the main path's actual walked length, not just the grid footprint", () => {
    // Regression guard: packing went through two wrong designs before this one — a first
    // cut that barely moved grid size (a fixed dominant term swamped it), then a fixed
    // grid-size formula that still didn't shorten the *visible* corridor, because
    // buildMaze always picked the spanning tree's true farthest node regardless of grid
    // size (the longest possible route, almost independent of how small the grid is).
    // The real fix targets path length directly, so this asserts the outcome that
    // actually matters: entrance-to-exit distance must grow with packing.
    const config = (packing: number): FloorConfig => ({
      pathPuzzles: 0,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      corridorStraightness: 0,
      packing,
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "staircase", gate: { type: "tomb-key", wardKeyId: "w" } },
        { pathPuzzles: 2, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
      ],
    })
    const distanceFor = (packing: number) => {
      const result = assembleFloor("packing-test", config(packing), 7)
      if (!result.success) throw new Error("assembly failed")
      return graphDistance(result.grid, result.grid.entrancePos, result.grid.exitPos)
    }
    const tight = distanceFor(0.3)
    const normal = distanceFor(1)
    const spacious = distanceFor(2)
    expect(tight).toBeLessThan(normal)
    expect(normal).toBeLessThan(spacious)
  })

  it("the exit is always a dead-end — no corridor continues past it", () => {
    // Regression guard: the packing knob ends the main path at a mid-maze node, not the
    // maze's farthest leaf, so the exit cell could keep tree passages into adjacent used
    // side-section corridors — drawn as doors, making corridor read as continuing past an
    // exit that ends the visit when stepped on. The exit must have exactly one connection.
    const config: FloorConfig = {
      pathPuzzles: 1,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      packing: 1,
      sideSections: [
        { pathPuzzles: 2, difficulty: "starter", end: "treasure", gate: { type: "tomb-key", wardKeyId: "w" } },
        { pathPuzzles: 2, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
      ],
    }
    for (let seed = 0; seed < 40; seed++) {
      const result = assembleFloor("exit-deadend", config, seed)
      if (!result.success) continue
      const [er, ec] = result.grid.exitPos
      const exit = result.grid.cells[er][ec]
      expect(exit.type).toBe("room")
      if (exit.type !== "room") continue
      expect(exit.dirs.size).toBe(1)
    }
  })

  it("packing's path-length target isn't inflated by heavy side-section content", () => {
    // Regression guard: the target was first derived from `minCells`, which folds in every
    // side-section's own cost — so a floor with two chunky gated sections got a much longer
    // main path than one with none, at the same packing, even though those sections branch
    // off the main path rather than extending it. Distances should land in the same
    // ballpark regardless of how much side-section content exists.
    const distanceFor = (sideSections: FloorConfig["sideSections"]) => {
      const config: FloorConfig = {
        pathPuzzles: 4,
        difficulty: "starter",
        end: "treasure",
        exitOrStaircase: "exit",
        corridorStraightness: 0.65,
        packing: 0.3,
        sideSections,
      }
      const result = assembleFloor("packing-inflation-test", config, 7)
      if (!result.success) throw new Error("assembly failed")
      return graphDistance(result.grid, result.grid.entrancePos, result.grid.exitPos)
    }
    const bare = distanceFor([])
    const heavy = distanceFor([
      { pathPuzzles: 2, difficulty: "starter", end: "treasure", gate: { type: "tomb-key", wardKeyId: "w" } },
      { pathPuzzles: 2, difficulty: "junior", end: "staircase", gate: { type: "floor-key" } },
    ])
    expect(heavy).toBeLessThan(bare * 1.5)
  })
})
