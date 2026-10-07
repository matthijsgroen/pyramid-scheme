import { describe, expect, it } from "vitest"
import { regionBarrierCovers } from "./regionBarrierCover"
import type { CellState, Direction, FloorGrid, GridCell } from "./siteTypes"

const corridor = (dirs: Direction[], region?: string, state: CellState = "reachable"): GridCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state,
  ...(region ? { region } : {}),
})
const blockage = (dirs: Direction[], entrance = "pumpRoom"): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "reachable",
  region: "hall",
  requiredKeyId: "sluice",
  regionBarrier: { region: "hall", entrance, realisation: "water" },
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

describe("a region barrier's cover lies only where the explorer cannot walk", () => {
  // pump room ─ hall ─ hall ─ blockage ─ hall ─ hall
  const row = grid([
    [
      corridor(["e"], "pumpRoom"),
      corridor(["w", "e"], "hall"),
      corridor(["w", "e"], "hall"),
      blockage(["w", "e"]),
      corridor(["w", "e"], "hall"),
      corridor(["w"], "hall"),
    ],
  ])

  it("leaves the region's ground before the blockage dry", () => {
    const cells = coverOf(row)
    expect(cells.has("0,1")).toBe(false)
    expect(cells.has("0,2")).toBe(false)
  })

  it("fades the blockage in from the side the explorer walks up to it from", () => {
    expect(coverOf(row).get("0,3")).toEqual({ at: [0, 3], fadeFrom: ["w"] })
  })

  it("covers the ground past the blockage in full", () => {
    const cells = coverOf(row)
    expect(cells.get("0,4")).toEqual({ at: [0, 4] })
    expect(cells.get("0,5")).toEqual({ at: [0, 5] })
  })

  it("covers nothing outside the region", () => {
    expect(coverOf(row).has("0,0")).toBe(false)
  })

  it("fades a blockage on the region's edge from the ground outside it", () => {
    const g = grid([[corridor(["e"], "pumpRoom"), blockage(["w", "e"]), corridor(["w"], "hall")]])
    const cells = coverOf(g)
    expect(cells.get("0,1")).toEqual({ at: [0, 1], fadeFrom: ["w"] })
    expect(cells.get("0,2")).toEqual({ at: [0, 2] })
  })

  it("fades a blockage walked up to from two sides from both", () => {
    //            pumpRoom
    //               │
    // gallery ─ blockage ─ hall
    const g = grid([
      [empty, corridor(["s"], "pumpRoom"), empty],
      [corridor(["e"], "gallery"), blockage(["n", "w", "e"]), corridor(["w"], "hall")],
    ])
    expect(coverOf(g).get("1,1")?.fadeFrom).toEqual(["n", "w"])
  })

  it("fades each door of a barrier with two entrances from its own side, and covers the ground between them in full", () => {
    // pumpRoom ─ blockage ─ hall ─ blockage ─ gallery
    const g = grid([
      [
        corridor(["e"], "pumpRoom"),
        blockage(["w", "e"]),
        corridor(["w", "e"], "hall"),
        blockage(["w", "e"], "gallery"),
        corridor(["w"], "gallery"),
      ],
    ])
    const cells = coverOf(g)
    expect(cells.get("0,1")).toEqual({ at: [0, 1], fadeFrom: ["w"] })
    expect(cells.get("0,2")).toEqual({ at: [0, 2] })
    expect(cells.get("0,3")).toEqual({ at: [0, 3], fadeFrom: ["e"] })
  })

  it("covers fogged ground past the blockage not at all", () => {
    const g = grid([
      [
        corridor(["e"], "pumpRoom"),
        blockage(["w", "e"]),
        corridor(["w", "e"], "hall"),
        corridor(["w"], "hall", "fogged"),
      ],
    ])
    const cells = coverOf(g)
    expect(cells.get("0,2")).toEqual({ at: [0, 2] })
    expect(cells.has("0,3")).toBe(false)
  })

  it("keeps a dry side branch of the region dry while the blockage beside it is covered", () => {
    // pumpRoom ─ hall ─ blockage ─ hall
    //             │
    //            hall
    const g = grid([
      [corridor(["e"], "pumpRoom"), corridor(["w", "e", "s"], "hall"), blockage(["w", "e"]), corridor(["w"], "hall")],
      [empty, corridor(["n"], "hall"), empty, empty],
    ])
    expect([...coverOf(g).keys()].sort()).toEqual(["0,2", "0,3"])
  })
})
