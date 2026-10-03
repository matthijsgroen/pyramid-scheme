import { describe, expect, it } from "vitest"
import { placeSequences } from "./sequenceTiles"
import type { Direction, FloorGrid, GridCell } from "./siteTypes"

// A floor drawn in characters: `o` a room, `.` a corridor node, `-` and `|` the connectors between nodes,
// `D` the room whose key the sequence resets at. Each cell names the ways to its neighbours it is joined to.
const draw = (rows: string[], regionOf: (r: number, c: number) => string = () => "hall"): FloorGrid => {
  const at = (r: number, c: number) => rows[r]?.[c] ?? " "
  const cells: GridCell[][] = rows.map((row, r) =>
    [...row].map((ch, c): GridCell => {
      if (ch === " ") return { type: "empty" }
      const dirs = new Set<Direction>()
      if (ch === "-" || at(r, c + 1) === "-") dirs.add("e")
      if (ch === "-" || at(r, c - 1) === "-") dirs.add("w")
      if (ch === "|" || at(r + 1, c) === "|") dirs.add("s")
      if (ch === "|" || at(r - 1, c) === "|") dirs.add("n")
      if (ch === "-") for (const dir of ["n", "s"] as const) dirs.delete(dir)
      if (ch === "|") for (const dir of ["e", "w"] as const) dirs.delete(dir)
      if (ch === "o" || ch === "D")
        return {
          type: "room",
          roomType: "encounter",
          dirs,
          state: "reachable",
          region: regionOf(r, c),
          ...(ch === "D" ? { requiredKeyId: "door" } : {}),
        }
      return { type: "corridor", dirs, state: "reachable", region: regionOf(r, c) }
    })
  )
  return {
    cells,
    rows: rows.length,
    cols: rows[0].length,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    siteId: "t",
    staircases: {},
  }
}

const plates = (steps: number) => ({
  id: "plates",
  regions: Array.from({ length: steps }, () => "hall"),
  glyphs: Array.from({ length: steps }, (_, n) => n),
  gates: [{ gateKeyId: "vault" }],
  doorKey: "door",
})

const tileCells = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) => row.flatMap((cell, c) => (cell.type === "room" && cell.sequenceTile ? [[r, c]] : [])))

// The corridor from the entrance has one cell on a loop either side of a junction: only the line before it
// is a cell every walk crosses.
const LOOP = ["o-.-.-.", "|   | |", "D   .-."]

describe("placeSequences", () => {
  it("stands a tile only on a cell no walk goes round, never on a corner of a loop", () => {
    for (const salt of "abcdefghijklmnopqrst") {
      const grid = draw(LOOP)
      expect(placeSequences(grid.cells as GridCell[][], grid, [plates(1)], salt)).toBeUndefined()
      expect(tileCells(grid)).toEqual([[0, 2]])
    }
  })

  it("refuses the step, naming the sequence, when every cell of its region lies on a loop", () => {
    const grid = draw(LOOP, (r, c) => (r === 0 && c === 2 ? "line" : "hall"))
    expect(placeSequences(grid.cells as GridCell[][], grid, [plates(1)], "a")).toEqual({ id: "plates", step: 0 })
  })

  it("does not stand a tile on a dead end, where nothing passes", () => {
    const grid = draw(["o-.-.", "|", "D"])
    expect(placeSequences(grid.cells as GridCell[][], grid, [plates(2)], "a")).toEqual({ id: "plates", step: 1 })
  })
})
