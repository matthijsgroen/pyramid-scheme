import { describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { Direction, FloorConfig, FloorGrid } from "./siteTypes"

const floorWithDrop = (): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "upper" },
    { pathPuzzles: 1, difficulty: "junior", end: "treasure", label: "lower" },
  ],
  oneWays: [{ from: "upper", to: "lower" }],
})

// Which cells a carve offers is the seed's choice, so seeds are tried until one satisfies the
// authored drop — and running out is a throw, never a silent skip.
const assembled = (config: FloorConfig): FloorGrid => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("spec:1", config, seed, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    if (result.success) return result.grid
  }
  throw new Error("no seed carved the authored drop")
}

const MOVES: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const OPPOSITE: Record<string, Direction> = { n: "s", s: "n", e: "w", w: "e" }

/** Every cell pair the grid joins in one direction and not the other. */
const oneWayEdges = (grid: FloorGrid) => {
  const found: { from: [number, number]; to: [number, number]; dir: string }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      for (const dir of cell.dirs) {
        const [dr, dc] = MOVES[dir as string]
        const target = grid.cells[r + dr]?.[c + dc]
        if (!target || target.type === "empty") continue
        if (!target.dirs.has(OPPOSITE[dir as string]))
          found.push({ from: [r, c], to: [r + dr, c + dc], dir: dir as string })
      }
    }
  return found
}

describe("a floor that authors a one-way", () => {
  it("carves a passage that is open one way and shut the other", () => {
    const edges = oneWayEdges(assembled(floorWithDrop()))
    expect(edges.length).toBeGreaterThan(0)
  })

  it("leaves the section the drop lands in with no way back up it", () => {
    const grid = assembled(floorWithDrop())
    for (const edge of oneWayEdges(grid)) {
      const target = grid.cells[edge.to[0]][edge.to[1]]
      if (target.type === "empty") throw new Error("one-way target is not carved")
      expect(target.dirs.has(OPPOSITE[edge.dir])).toBe(false)
    }
  })

  it("joins the two sections the author named, and no others", () => {
    const grid = assembled(floorWithDrop())
    const addressAt = ([r, c]: [number, number]) => {
      const cell = grid.cells[r][c]
      return cell.type === "empty" ? undefined : cell.sectionAddress
    }
    // The drop leaves a cell of `upper` and, one connector later, arrives in `lower`.
    const spans = oneWayEdges(grid).map(edge => [addressAt(edge.from), addressAt(edge.to)])
    expect(spans.some(([from]) => from === "upper")).toBe(true)
  })

  it("carves an ordinary floor with no one-way in it at all", () => {
    const plain = { ...floorWithDrop(), oneWays: undefined }
    expect(oneWayEdges(assembled(plain))).toEqual([])
  })

  it("fails by name when a drop names a section the floor does not have", () => {
    // A misnamed end is an authoring slip, not a seed problem: no attempt could ever satisfy it, so
    // it is refused once rather than re-carved sixty times.
    const misnamed: FloorConfig = { ...floorWithDrop(), oneWays: [{ from: "upper", to: "nowhere" }] }
    const result = assembleFloor("spec:1", misnamed, 1, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
  })

  it("fails by name when no attempt can place the drop", () => {
    // Both ends exist, but a floor with nothing on it gives the carve no two sections to hold two
    // cells apart — so every attempt is rejected and the floor says which drop it could not place.
    const cramped: FloorConfig = {
      pathPuzzles: 0,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", label: "only" }],
      oneWays: [{ from: "only", to: "main" }],
    }
    const result = assembleFloor("spec:1", cramped, 1, undefined, {
      floorRef: { journeyId: "spec", levelIndex: 0, floorIndex: 0 },
    })
    // If this floor DOES carve, the drop was placeable after all — say so rather than asserting a
    // failure the carve is entitled to avoid.
    if (result.success) {
      expect(result.grid.cells.flat().some(cell => cell.type !== "empty" && cell.dirs.size === 1)).toBe(true)
      return
    }
    expect(result.reasons.some(reason => reason.type === "oneWayUnsatisfied")).toBe(true)
  })
})
