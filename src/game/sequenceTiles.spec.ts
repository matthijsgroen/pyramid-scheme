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

const plates = (...regions: string[]) => ({
  id: "plates",
  regions,
  glyphs: regions.map((_, n) => n),
  gates: [{ gateKeyId: "vault" }],
  doorKey: "door",
})

const tileCells = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && cell.sequenceTile ? [{ at: [r, c], ...cell.sequenceTile, home: !!cell.mechanism }] : []
    )
  )

// A hub room in the middle, entered from the west room (where the floor starts), the east wing and the door to
// the south. Each way in runs onto a corridor node of the hub before the hub's room.
const HUB = ["o-.-o-.-.-o", "    |      ", "    .      ", "    |      ", "    D      "]
const hubRegions = (r: number, c: number) => (c <= 1 ? "west" : c >= 7 ? "east" : r >= 3 ? "south" : "hub")

describe("placeSequences", () => {
  it("stands a step's tile on every way into its room, each the same step and glyph, named by where it comes from", () => {
    const grid = draw(HUB, hubRegions)
    expect(placeSequences(grid.cells as GridCell[][], grid, [plates("hub", "east")])).toBeUndefined()
    expect(tileCells(grid)).toEqual([
      { at: [0, 2], id: "plates", step: 0, glyph: 0, entrance: "west", home: true },
      { at: [0, 6], id: "plates", step: 0, glyph: 0, entrance: "east", home: false },
      { at: [0, 8], id: "plates", step: 1, glyph: 1, entrance: "hub", home: false },
      { at: [2, 4], id: "plates", step: 0, glyph: 0, entrance: "south", home: false },
    ])
  })

  it("stands the tile of a step in the room the floor starts in on the way out of the start", () => {
    const grid = draw(HUB, hubRegions)
    expect(placeSequences(grid.cells as GridCell[][], grid, [plates("west", "hub")])).toEqual({
      id: "plates",
      step: 0,
      reason: "no free node of west stands on its way in from start",
    })
    const started = draw(["o-.-.-.-D"], (_, c) => (c <= 3 ? "west" : "hub"))
    expect(placeSequences(started.cells as GridCell[][], started, [plates("west", "hub")])).toBeUndefined()
    expect(
      tileCells(started)
        .filter(tile => tile.step === 0)
        .map(({ at, entrance }) => ({ at, entrance }))
    ).toEqual([{ at: [0, 2], entrance: "start" }])
  })

  it("refuses a step, saying why, when a way into its room reaches the room before any free node", () => {
    const grid = draw(HUB, (r, c) => (c === 2 ? "west" : hubRegions(r, c)))
    expect(placeSequences(grid.cells as GridCell[][], grid, [plates("hub", "east")])).toEqual({
      id: "plates",
      step: 0,
      reason: "no free node of hub stands on its way in from west",
    })
  })

  it("refuses a step whose room an earlier step names, since one crossing would step on both", () => {
    const grid = draw(HUB, hubRegions)
    expect(placeSequences(grid.cells as GridCell[][], grid, [plates("hub", "east", "hub")])).toEqual({
      id: "plates",
      step: 2,
      reason: "hub holds step 0 too",
    })
  })
})
