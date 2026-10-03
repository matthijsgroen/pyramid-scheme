import { beforeAll, describe, expect, it } from "vitest"
import { assembleFloor } from "./siteAssembler"
import type { FloorGrid, GridCell } from "./siteTypes"
import { cellAddress } from "./cellAddress"
import { withGateFaces } from "./gateFace"
import { progressState, spoiledState } from "./sequence"
import { tileStatusAt, walkPresses } from "./sequencePlay"
import { hallAnnexSequenceFloor } from "./testSupport/sequenceFixtures"

type Place = readonly [number, number]

let grid: FloorGrid
beforeAll(() => {
  for (let seed = 1; seed < 60; seed++) {
    const result = assembleFloor("test", hallAnnexSequenceFloor(), seed)
    if (result.success) {
      grid = result.grid
      return
    }
  }
  throw new Error("no seed carved")
})

const tiles = (g: FloorGrid) =>
  g.cells
    .flatMap((row, r) => row.map((cell, c) => ({ cell, at: [r, c] as Place })))
    .filter(({ cell }) => cell.type === "room" && cell.sequenceTile)
    .sort(
      (a, b) =>
        (a.cell as { sequenceTile: { step: number } }).sequenceTile.step -
        (b.cell as { sequenceTile: { step: number } }).sequenceTile.step
    )

const lit = (g: FloorGrid): FloorGrid => ({
  ...g,
  cells: g.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
  ),
})

const home = () => {
  const [h] = tiles(grid)
  return cellAddress(grid, 0, h.at[0], h.at[1])!
}

describe("the writes a walk makes to a sequence", () => {
  it("every tile on the route is worked in the order the route reaches them", () => {
    const [a, b, c] = tiles(grid).map(t => t.at)
    const writes = walkPresses(lit(grid), 0, [[0, 0], a, b, c], new Map())
    expect(writes.map(w => w.state)).toEqual([progressState(1), progressState(2), progressState(3)])
    expect(new Set(writes.map(w => w.address))).toEqual(new Set([home()]))
  })

  it("the cell the walk starts on is not stepped onto", () => {
    const [a, b] = tiles(grid).map(t => t.at)
    expect(walkPresses(lit(grid), 0, [a], new Map())).toEqual([])
    // Had the first tile been worked, the second would have advanced the run rather than spoiled it.
    expect(walkPresses(lit(grid), 0, [a, b], new Map())).toEqual([{ address: home(), state: spoiledState(0, 1) }])
  })

  it("a tile still in fog does not register, however the route reaches it", () => {
    const [a, b] = tiles(grid)
    const fogged: FloorGrid = {
      ...lit(grid),
      cells: lit(grid).cells.map((row, r) =>
        row.map((cell, c) =>
          r === a.at[0] && c === a.at[1] && cell.type === "room" ? { ...cell, state: "fogged" } : cell
        )
      ),
    }
    expect(walkPresses(fogged, 0, [[0, 0], a.at, b.at], new Map())).toEqual([
      { address: home(), state: spoiledState(0, 1) },
    ])
  })

  it("a tile walked out of order spoils the run and the tiles after it write nothing more", () => {
    const [, b, c] = tiles(grid).map(t => t.at)
    const writes = walkPresses(lit(grid), 0, [[0, 0], c, b], new Map())
    expect(writes).toEqual([{ address: home(), state: spoiledState(0, 2) }])
  })

  it("a tile already walked in order writes nothing", () => {
    const [a] = tiles(grid).map(t => t.at)
    expect(walkPresses(lit(grid), 0, [[0, 0], a], new Map([[home(), progressState(1)]]))).toEqual([])
  })

  it("a route over no tile writes nothing", () => {
    expect(walkPresses(lit(grid), 0, [grid.entrancePos as Place, grid.entrancePos as Place], new Map())).toEqual([])
  })
})

describe("how a tile stands", () => {
  it("each tile reads its own status from the run's state, and a cell that is no tile reads nothing", () => {
    const placed = tiles(grid)
    const states = new Map([[home(), spoiledState(1, 2)]])
    expect(placed.map(({ at }) => tileStatusAt(grid, 0, at[0], at[1], states))).toEqual([
      "inOrder",
      "unwalked",
      "outOfOrder",
    ])
    expect(tileStatusAt(grid, 0, grid.entrancePos[0], grid.entrancePos[1], states)).toBeUndefined()
  })

  it("a run with nothing stored reads every tile unwalked", () => {
    expect(tiles(grid).map(({ at }) => tileStatusAt(grid, 0, at[0], at[1], undefined))).toEqual([
      "unwalked",
      "unwalked",
      "unwalked",
    ])
  })
})

describe("the face a sequence gives its door", () => {
  const door = (g: FloorGrid) =>
    g.cells
      .flatMap((row, r) => row.map((cell, c) => ({ cell, at: [r, c] as Place })))
      .find(({ cell }) => cell.type === "room" && cell.worksMechanism && !cell.sequenceTile)!

  const faceOf = (states: Map<string, string>) => {
    const d = door(withGateFaces(grid, 0, states))
    return d.cell.type === "room" ? d.cell : undefined
  }

  it("is put on the door although nothing else owns it, listing the tiles in step order with their glyphs", () => {
    const face = faceOf(new Map())
    expect(face?.family).toBe("gate-face")
    expect(face?.gateFace?.markers).toEqual([])
    const [order] = face!.gateFace!.sequences!
    expect(order.tiles.map(t => t.glyph)).toEqual(
      tiles(grid).map(t => (t.cell as { sequenceTile: { glyph: number } }).sequenceTile.glyph)
    )
    expect(order.tiles.map(t => t.status)).toEqual(["unwalked", "unwalked", "unwalked"])
  })

  it("carries the reset only once there is a run to start again, as the write that sends it to the start", () => {
    expect(faceOf(new Map())!.gateFace!.sequences![0].reset).toBeUndefined()
    for (const state of [progressState(1), progressState(2), spoiledState(0, 2)])
      expect(faceOf(new Map([[home(), state]]))!.gateFace!.sequences![0].reset).toEqual({
        address: home(),
        state: progressState(0),
      })
  })

  it("shows the spoiled run: the tile that went wrong and the tiles walked before it", () => {
    const [order] = faceOf(new Map([[home(), spoiledState(1, 2)]]))!.gateFace!.sequences!
    expect(order.tiles.map(t => t.status)).toEqual(["inOrder", "unwalked", "outOfOrder"])
  })
})
