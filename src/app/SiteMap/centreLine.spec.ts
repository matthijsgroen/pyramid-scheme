import { describe, expect, it } from "vitest"
import type { CorridorCell, Direction, FloorGrid } from "@/game/siteTypes"
import { centreLine } from "./centreLine"
import { COL_PITCH, ROW_PITCH } from "./mapScale"

const oneCell = (dirs: Direction[], shoulder?: Direction): FloorGrid => {
  const cell: CorridorCell = {
    type: "corridor",
    dirs: new Set(dirs),
    state: "visible",
    ...(shoulder ? { shoulder } : {}),
  }
  return { siteId: "site", rows: 1, cols: 1, entrancePos: [0, 0], exitPos: [0, 0], staircases: {}, cells: [[cell]] }
}

describe("centreLine", () => {
  it("a narrow corridor is walked at its cells' centres", () => {
    expect(centreLine(oneCell(["e", "w"]), 0, 0)).toEqual({ dx: 0, dy: 0 })
  })

  it("a wide straight is walked half a cell toward its second lane", () => {
    expect(centreLine(oneCell(["e", "w"], "s"), 0, 0)).toEqual({ dx: 0, dy: ROW_PITCH / 2 })
    expect(centreLine(oneCell(["n", "s"], "w"), 0, 0)).toEqual({ dx: -COL_PITCH / 2, dy: 0 })
  })

  it("a wide bend cuts toward its inside corner, or away from its ways round the outside", () => {
    expect(centreLine(oneCell(["w", "s"], "s"), 0, 0)).toEqual({ dx: -COL_PITCH / 2, dy: ROW_PITCH / 2 })
    expect(centreLine(oneCell(["w", "n"], "s"), 0, 0)).toEqual({ dx: COL_PITCH / 2, dy: ROW_PITCH / 2 })
  })
})
