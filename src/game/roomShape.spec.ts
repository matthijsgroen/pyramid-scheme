import { describe, expect, it } from "vitest"
import { prefabRoomCells, roomDoors } from "./roomShape"
import type { Direction, FloorGrid, GridCell } from "./siteTypes"

const corridor = (...dirs: Direction[]): GridCell => ({ type: "corridor", dirs: new Set(dirs), state: "fogged" })

// A fork at 2,4 laid over by a prefab whose rect is the 4×3 at rows 1–3, cols 2–5: its west arm leaves by the door
// place at 2,1, its east arm by 2,6 and its north arm by 0,4.
const grid = (): FloorGrid => {
  const placed: Record<string, GridCell> = {
    "2,4": {
      type: "room",
      roomType: "fork",
      dirs: new Set<Direction>(["n", "e", "w"]),
      state: "fogged",
      prefabRoom: {
        name: "hall",
        layout: 0,
        mirrored: false,
        rect: { top: 1, left: 2, rows: 3, cols: 4 },
        stop: [3, 4],
        objects: [],
        blocked: [],
        doors: { n: [0, 4], e: [2, 6], w: [2, 1] },
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
  it("maps every rect cell to its node and names the cell inside each door place", () => {
    const floor = grid()
    const cells = prefabRoomCells(floor)
    expect(cells.size).toBe(12)
    for (let r = 1; r <= 3; r++) for (let c = 2; c <= 5; c++) expect(cells.get(`${r},${c}`)).toBe("2,4")
    expect(cells.has("2,6")).toBe(false)
    expect(prefabRoomCells(floor)).toBe(cells)
    expect(roomDoors(floor, 2, 4)).toEqual({ n: [1, 4], e: [2, 5], w: [2, 2] })
    expect(roomDoors(floor, 2, 6)).toEqual({})
  })

  it("maps the rect of a prefab laid over a corridor's end to that corridor", () => {
    const plain = grid()
    const floor = { ...plain, cells: plain.cells.map(row => [...row]) }
    floor.cells[0][4] = {
      type: "corridor",
      dirs: new Set<Direction>(["s"]),
      state: "fogged",
      prefabRoom: {
        name: "nook",
        layout: 0,
        mirrored: false,
        rect: { top: 0, left: 3, rows: 1, cols: 2 },
        stop: [0, 3],
        objects: [],
        blocked: [],
        doors: {},
      },
    }
    expect(prefabRoomCells(floor).get("0,3")).toBe("0,4")
    expect(prefabRoomCells(floor).get("0,4")).toBe("0,4")
  })
})
