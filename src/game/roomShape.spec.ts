import { describe, expect, it } from "vitest"
import { grownCells, roomDoors } from "./roomShape"
import type { Direction, FloorGrid, GridCell } from "./siteTypes"

const corridor = (...dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state: "fogged" })

// A fork at 2,4 grown to the 4×3 at rows 1–3, cols 2–5: its west arm leaves at 2,2, its east arm at 2,5, and its
// north arm leaves straight from the top row's cell above it.
const grid = (): FloorGrid => {
  const placed: Record<string, GridCell> = {
    "2,4": {
      type: "room",
      roomType: "fork",
      dirs: new Set<Direction>(["n", "e", "w"]),
      state: "fogged",
      decoration: "basin",
      grownRoom: {
        rect: { top: 1, left: 2, rows: 3, cols: 4 },
        piece: { kind: "basin", top: 2, left: 3, rows: 1, cols: 2 },
      },
    },
    "2,0": corridor("e", "w"),
    "2,1": corridor("e", "w"),
    "2,2": corridor("e", "w"),
    "2,3": corridor("e", "w"),
    "2,5": corridor("e", "w"),
    "2,6": corridor("e", "w"),
    "1,4": corridor("n", "s"),
    "0,4": corridor("n", "s"),
  }
  return {
    cells: Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 7 }, (_, c): GridCell => placed[`${r},${c}`] ?? { type: "empty" })
    ),
    rows: 5,
    cols: 7,
    entrancePos: [-9, -9],
    exitPos: [-9, -9],
    siteId: "site",
    staircases: {},
  }
}

describe("roomShape", () => {
  it("maps every rect cell to its node and names each arm's door", () => {
    const floor = grid()
    const cells = grownCells(floor)
    expect(cells.size).toBe(12)
    for (let r = 1; r <= 3; r++) for (let c = 2; c <= 5; c++) expect(cells.get(`${r},${c}`)).toBe("2,4")
    expect(cells.has("2,6")).toBe(false)
    expect(grownCells(floor)).toBe(cells)
    expect(roomDoors(floor, 2, 4)).toEqual({ n: [1, 4], e: [2, 5], w: [2, 2] })
    expect(roomDoors(floor, 2, 6)).toEqual({})
  })
})
