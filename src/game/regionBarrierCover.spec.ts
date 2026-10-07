import { describe, expect, it } from "vitest"
import { regionBarrierCovers } from "./regionBarrierCover"
import type { CellState, Direction, FloorGrid, GridCell } from "./siteTypes"

const corridor = (dirs: Direction[], region?: string, state: CellState = "reachable"): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state,
  ...(region ? { region } : {}),
})
const blockage = (dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "reachable",
  region: "hall",
  requiredKeyId: "sluice",
  regionBarrier: { region: "hall", entrance: "pumpRoom", realisation: "water" },
})
const empty: GridCell = { type: "empty" }

const grid = (cells: GridCell[][]): FloorGrid => ({
  siteId: "made-up",
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [0, 0],
  staircases: {},
  cells,
})

const coverOf = (g: FloorGrid) => {
  const covers = regionBarrierCovers(g)
  expect(covers).toHaveLength(1)
  return new Map(covers[0].cells.map(cell => [cell.at.join(","), cell]))
}

describe("a region barrier's cover fades in over the first cell in and is full from the second", () => {
  // pump room ─ hall ─ hall ─ hall ─ blockage
  const row = grid([
    [
      corridor(["e"], "pumpRoom"),
      corridor(["w", "e"], "hall"),
      corridor(["w", "e"], "hall"),
      corridor(["w", "e"], "hall"),
      blockage(["w"]),
    ],
  ])

  it("fades the first cell in from the side the way in is on", () => {
    expect(coverOf(row).get("0,1")).toEqual({ at: [0, 1], fadeFrom: ["w"] })
  })

  it("covers the second cell in, and every cell past it, in full", () => {
    const cells = coverOf(row)
    for (const key of ["0,2", "0,3", "0,4"]) expect(cells.get(key), key).toEqual({ at: key.split(",").map(Number) })
  })

  it("covers nothing outside the region", () => {
    expect(coverOf(row).has("0,0")).toBe(false)
  })

  it("fades a first cell entered from two sides from both", () => {
    //            pumpRoom
    //               │
    // gallery ─ hall ─ hall ─ blockage
    const g = grid([
      [empty, corridor(["s"], "pumpRoom"), empty, empty],
      [corridor(["e"], "gallery"), corridor(["n", "w", "e"], "hall"), corridor(["w", "e"], "hall"), blockage(["w"])],
    ])
    expect(coverOf(g).get("1,1")?.fadeFrom).toEqual(["n", "w"])
  })

  it("covers the blockage in full even where it is the first cell in", () => {
    const g = grid([[corridor(["e"], "pumpRoom"), blockage(["w"])]])
    expect(coverOf(g).get("0,1")).toEqual({ at: [0, 1] })
  })

  it("covers ground past the blockage in full, and fogged ground not at all", () => {
    const g = grid([
      [
        corridor(["e"], "pumpRoom"),
        corridor(["w", "e"], "hall"),
        blockage(["w", "e"]),
        corridor(["w", "e"], "hall"),
        corridor(["w"], "hall", "fogged"),
      ],
    ])
    const cells = coverOf(g)
    expect(cells.get("0,3")).toEqual({ at: [0, 3] })
    expect(cells.has("0,4")).toBe(false)
  })
})
