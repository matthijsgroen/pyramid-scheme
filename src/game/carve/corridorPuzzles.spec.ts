import { describe, expect, it } from "vitest"
import type { Direction, FloorGrid, GridCell } from "../siteTypes"
import { assembleFloor } from "./assembleFloor"
import { chamberFloor } from "./carveFixtures"
import { corridorPuzzleSpots } from "./corridorPuzzles"
import { cellSlot } from "../cellSlot"

const empty: GridCell = { type: "empty" }
const corridor = (dirs: Direction[], more: Partial<Extract<GridCell, { type: "corridor" }>> = {}): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state: "fogged",
  ...more,
})
const room = (dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "fogged",
})

// One row: a room at each end and `length` corridor cells between them. The entrance is far off the row, at an even
// column, so the even columns are the nodes.
const hall = (length: number, more: (c: number) => Partial<Extract<GridCell, { type: "corridor" }>> = () => ({})) =>
  ({
    cells: [
      [room(["e"]), ...Array.from({ length }, (_, i) => corridor(["w", "e"], more(i + 1))), room(["w"])],
      Array.from({ length: length + 2 }, () => empty),
      Array.from({ length: length + 2 }, () => empty),
    ],
    rows: 3,
    cols: length + 2,
    entrancePos: [2, 0],
    exitPos: [2, 0],
    staircases: {},
    siteId: "spots",
  }) as unknown as FloorGrid

describe("a puzzle standing in a long bare corridor", () => {
  it("stands only where the bare run is longer than five cells, on the node nearest its middle", () => {
    expect(corridorPuzzleSpots(hall(5), 3, "x")).toEqual([])
    expect(corridorPuzzleSpots(hall(7), 3, "x")).toEqual([[0, 4]])
  })

  it("splits the run, and a part still longer than five cells takes the next", () => {
    expect(corridorPuzzleSpots(hall(13), 1, "x")).toEqual([[0, 6]])
    expect(corridorPuzzleSpots(hall(13), 3, "x")).toEqual([
      [0, 6],
      [0, 10],
    ])
  })

  it("seats no more than asked and fewer where the floor has no run for them", () => {
    expect(corridorPuzzleSpots(hall(13), 5, "x")).toHaveLength(2)
    expect(corridorPuzzleSpots(hall(13), 0, "x")).toEqual([])
  })

  it("counts no cell with a drop, a gate or a hidden way on it, or a drop beside it", () => {
    expect(
      corridorPuzzleSpots(
        hall(9, c => (c === 5 ? { hidden: true } : {})),
        3,
        "x"
      )
    ).toEqual([])
    expect(
      corridorPuzzleSpots(
        hall(9, c => (c === 5 ? ({ openGate: true } as never) : {})),
        3,
        "x"
      )
    ).toEqual([])
    const drop = hall(11, c => (c === 6 ? { obstacle: { dir: "e", kind: "drop" } } : {}))
    expect(corridorPuzzleSpots(drop, 3, "x")).toEqual([])
  })
})

describe("a floor asking for corridor puzzles", { timeout: 60_000 }, () => {
  it("is carved with the same walls, and each puzzle it seats is a lootless room of its own slot", () => {
    let seated = 0
    for (const seed of [1, 2, 3, 4, 5]) {
      const bare = assembleFloor("site-1", chamberFloor(), seed)
      const asked = assembleFloor("site-1", chamberFloor({ corridorPuzzles: 3 }), seed)
      if (!bare.success || !asked.success) throw new Error("did not carve")
      asked.grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          const was = bare.grid.cells[r][c]
          expect(cell.type === "empty" ? [] : [...cell.dirs]).toEqual(was.type === "empty" ? [] : [...was.dirs])
          if (cell.type === "room" && cell.corridorPuzzle !== undefined) {
            seated++
            expect(was.type).toBe("corridor")
            expect(cell.reward).toBeUndefined()
            expect(cellSlot(asked.grid, r, c)).toBe(`xcorridor:${cell.corridorPuzzle}`)
          } else expect(cell).toEqual(was)
        })
      )
    }
    expect(seated).toBeGreaterThan(0)
  })
})
