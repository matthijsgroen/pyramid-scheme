import { describe, expect, it } from "vitest"
import { FLOOR_KINDS, scatterFor } from "./floorScatter"
import type { CellState, Direction, FloorGrid, GridCell } from "@/game/siteTypes"

const empty: GridCell = { type: "empty" }
const state: CellState = "completed"
const corridor: GridCell = { type: "corridor", dirs: new Set<Direction>(["n", "s"]), state }
const room: GridCell = {
  type: "room",
  roomType: "encounter",
  family: "sumplete",
  dirs: new Set<Direction>(["s"]),
  state,
}

/** The floor's way out. A room by type, and the one room nothing may be strewn on. */
const exitRoom: GridCell = { type: "room", roomType: "portal", dirs: new Set<Direction>(["s"]), state }

const plumbing = { entrancePos: [0, 0] as const, exitPos: [0, 1] as const, staircases: {} }

/** A row of rooms over rows of corridor, so both cell types are present in quantity and the two pools
 * can be told apart, plus an empty column to prove nothing is strewn on one. */
const floor = (siteId: string, rows = 6, cols = 6): FloorGrid => ({
  ...plumbing,
  siteId,
  rows,
  cols,
  cells: Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      c === cols - 1 ? empty : r === 0 && c === 0 ? exitRoom : r === 0 ? room : corridor
    )
  ),
})

describe("floor scatter", () => {
  it("puts several pieces on a floor", () => {
    const scatter = scatterFor(floor("starter_1:0"))
    expect(scatter.size).toBeGreaterThanOrEqual(2)
    expect(scatter.size).toBeLessThanOrEqual(7)
  })

  it("lands in the same places every time it is asked", () => {
    // The whole point of hashing the floor's id: a drift of sand that moved between two draws would
    // read as something happening.
    const a = scatterFor(floor("starter_1:0"))
    const b = scatterFor(floor("starter_1:0"))
    expect([...b]).toEqual([...a])
  })

  it("lands somewhere else on a different floor", () => {
    const a = [...scatterFor(floor("starter_1:0"))]
    const b = [...scatterFor(floor("starter_2:0"))]
    expect(b).not.toEqual(a)
  })

  it("never lies on a cell that is not floor", () => {
    const grid = floor("expert_3:1")
    for (const key of scatterFor(grid).keys()) {
      const [r, c] = key.split(",").map(Number)
      expect(grid.cells[r][c].type).not.toBe("empty")
    }
  })

  it("strews nothing on the floor's entrance or its way out", () => {
    // A portal room carries a marker of its own, and a drift drawn under the exit's star reads as part
    // of the star. Ground is excluded as well as furnishing, which costs the brief's "sand over a
    // threshold" and is worth it.
    for (const siteId of Array.from({ length: 80 }, (_, i) => `portal_${i}:0`)) {
      const grid = floor(siteId)
      for (const key of scatterFor(grid).keys()) {
        const [r, c] = key.split(",").map(Number)
        const cell = grid.cells[r][c]
        if (cell.type === "room") expect(cell.roomType).not.toBe("portal")
      }
    }
  })

  it("puts a mat only in a chamber, and sand in corridors too", () => {
    // The rule the whole layer exists for: a mat is furnishing and belongs to a room, where sand and
    // rubble blow and fall along a passage as readily as in a chamber.
    let sandInCorridor = 0
    for (const siteId of Array.from({ length: 60 }, (_, i) => `site_${i}:0`)) {
      const grid = floor(siteId)
      for (const [key, kind] of scatterFor(grid)) {
        const [r, c] = key.split(",").map(Number)
        const isRoom = grid.cells[r][c].type === "room"
        if (kind === "mat") {
          expect(isRoom).toBe(true)
          if (grid.cells[r][c].type === "room") expect(grid.cells[r][c].roomType).toBe("encounter")
        }
        if (!isRoom && kind === "sand") sandInCorridor++
      }
    }
    expect(sandInCorridor).toBeGreaterThan(0)
  })

  it("draws every kind it can place on the floor layer rather than as a prop", () => {
    // FLOOR_KINDS is what `Decoration` checks, so a kind the scatter layer places and Decoration also
    // draws would appear twice on one floor.
    for (const kind of scatterFor(floor("master_2:0")).values()) expect(FLOOR_KINDS.has(kind)).toBe(true)
  })

  it("has nothing to strew on a floor with no cells", () => {
    const bare: FloorGrid = {
      ...plumbing,
      siteId: "x",
      rows: 2,
      cols: 2,
      cells: [
        [empty, empty],
        [empty, empty],
      ],
    }
    expect(scatterFor(bare).size).toBe(0)
  })
})
