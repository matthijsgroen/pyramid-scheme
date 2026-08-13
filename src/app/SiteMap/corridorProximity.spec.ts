import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { isCorridorNearby, NEARBY_STEPS } from "./corridorProximity"

// A single straight corridor, so distance along it is just the column difference.
const corridor = (dirs: Direction[]): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state: "completed",
})

const rowOf = (length: number): FloorGrid => ({
  cells: [Array.from({ length }, (_, i) => corridor(i === 0 ? ["e"] : i === length - 1 ? ["w"] : ["w", "e"]))],
  rows: 1,
  cols: length,
  entrancePos: [0, 0],
  exitPos: [0, length - 1],
  siteId: "test-site",
  staircases: {},
})

const junctionsAt = (...cols: number[]) =>
  new Map(cols.map(col => [`0,${col}`, new Set(["section-hash"]) as ReadonlySet<string>]))

describe("isCorridorNearby", () => {
  it("is false when the floor holds no unnoticed corridor at all", () => {
    expect(isCorridorNearby(rowOf(10), [0, 0], new Map())).toBe(false)
  })

  it("is false with no grid to measure across", () => {
    expect(isCorridorNearby(null, [0, 0], junctionsAt(1))).toBe(false)
  })

  it("counts the junction the player is standing on as nearby", () => {
    expect(isCorridorNearby(rowOf(10), [0, 3], junctionsAt(3))).toBe(true)
  })

  it("is true just inside the radius and false just outside it", () => {
    const grid = rowOf(20)
    expect(isCorridorNearby(grid, [0, 0], junctionsAt(NEARBY_STEPS))).toBe(true)
    expect(isCorridorNearby(grid, [0, 0], junctionsAt(NEARBY_STEPS + 1))).toBe(false)
  })

  it("takes the closest lead when several are on the floor", () => {
    const grid = rowOf(20)
    expect(isCorridorNearby(grid, [0, 0], junctionsAt(15, 2, 18))).toBe(true)
  })

  // Walking distance, not straight-line: the row is severed at column 2, so a junction at column 4 —
  // four columns away on paper, unreachable in practice — must not read as nearby.
  it("measures how far the player must walk, not how close the corridor looks", () => {
    const severed: FloorGrid = {
      ...rowOf(6),
      cells: [
        [corridor(["e"]), corridor(["w"]), { type: "empty" }, corridor(["e"]), corridor(["w"]), { type: "empty" }],
      ],
    }
    expect(isCorridorNearby(severed, [0, 0], junctionsAt(4))).toBe(false)
    // ...while a junction on the player's own side of the break still counts.
    expect(isCorridorNearby(severed, [0, 0], junctionsAt(1))).toBe(true)
  })
})
