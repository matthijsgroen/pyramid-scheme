import { describe, expect, it } from "vitest"
import type { CorridorCell, FloorGrid, GridCell, RoomCell } from "../../siteTypes"
import { validateSite } from "../../siteValidator"
import { assembleFloor } from "../assembleFloor"
import { drawnSketch, plainFloor } from "../carveFixtures"
import { ROOMS_ENGINE } from "../engines"
import { OPPOSITE } from "../grid"
import type { Cell } from "../state"
import { carveLayout } from "./carveLayout"
import { embedFloor, type EmbedOptions } from "./embedFloor"
import { floorGraph, keyOf, MOVES } from "./graph"
import { layoutFloor } from "./layout"
import { narrowsLane } from "./wide"

const SEEDS = [1, 2, 3, 4, 5, 6]

const embed = (grid: FloorGrid, options: Partial<EmbedOptions> = {}): FloorGrid => {
  const embedded = embedFloor(grid, { seed: 1, spread: 0, rooms: new Map(), ...options })
  if ("refused" in embedded) throw new Error(embedded.refused)
  return embedded.grid
}

/** A drawn sketch with some of its cells changed, by "r,c". */
const sketchWith = (rows: string[], changes: Record<string, Partial<RoomCell>>): FloorGrid => {
  const sketch = drawnSketch(rows)
  const cells = sketch.cells.map((row, r) =>
    row.map((cell, c): GridCell => (changes[`${r},${c}`] ? ({ ...cell, ...changes[`${r},${c}`] } as GridCell) : cell))
  )
  return { ...sketch, cells }
}

const cellsOf = (grid: FloorGrid): { at: Cell; cell: GridCell }[] =>
  grid.cells.flatMap((row, r) => row.map((cell, c) => ({ at: [r, c] as Cell, cell })))
const lanesOf = (grid: FloorGrid) =>
  cellsOf(grid).filter((x): x is { at: Cell; cell: CorridorCell } => x.cell.type === "corridor" && !!x.cell.shoulderOf)
const near = ([r, c]: Cell): Cell[] => Object.values(MOVES).map(([dr, dc]): Cell => [r + dr, c + dc])
const at = (grid: FloorGrid, [r, c]: Cell) => grid.cells[r]?.[c]

/** The cells the entrance's walk reaches, in walking order along a floor with no fork. */
const walkLine = (grid: FloorGrid): Cell[] => {
  const line: Cell[] = [grid.entrancePos as Cell]
  const seen = new Set([keyOf(grid.entrancePos)])
  for (;;) {
    const here = at(grid, line[line.length - 1])!
    if (here.type === "empty") return line
    const next = [...here.dirs]
      .map((dir): Cell => [line[line.length - 1][0] + MOVES[dir][0], line[line.length - 1][1] + MOVES[dir][1]])
      .find(cell => !seen.has(keyOf(cell)))
    if (!next) return line
    seen.add(keyOf(next))
    line.push(next)
  }
}

const TWO_ARMS = [
  "E.S.S.S.S.S.F.S.S.S.S.T",
  "            .",
  "            S",
  "            .",
  "            S",
  "            .",
  "            S",
  "            .",
  "            S",
  "            .",
  "            T",
]

describe("wide corridors", () => {
  it("a wide floor gives every corridor a second lane", () => {
    for (const seed of SEEDS) {
      const grid = embed(drawnSketch(TWO_ARMS), { seed, wide: true })
      // A stop in a corridor, more than two steps from where it meets a piece, walks the centre line.
      const isStop = (cell: GridCell | undefined) => cell?.type === "room" && cell.dirs.size === 2 && !cell.tags
      const nearPiece = (stop: Cell) => {
        let frontier = [stop]
        const seen = new Set([keyOf(stop)])
        for (let step = 0; step < 2; step++) {
          frontier = frontier.flatMap(cell => {
            const here = at(grid, cell)
            if (here?.type === "empty" || !here) return []
            return [...here.dirs].map((dir): Cell => [cell[0] + MOVES[dir][0], cell[1] + MOVES[dir][1]])
          })
          frontier = frontier.filter(cell => !seen.has(keyOf(cell)) && seen.add(keyOf(cell)))
          if (frontier.some(cell => at(grid, cell)?.type === "room" && !isStop(at(grid, cell)))) return true
        }
        return false
      }
      const stops = cellsOf(grid).filter(({ at: cell, cell: here }) => isStop(here) && !nearPiece(cell))
      expect(stops.length).toBeGreaterThan(3)
      for (const { at: stop, cell } of stops)
        expect(cell.type !== "empty" && cell.shoulder, `stop at ${keyOf(stop)}`).toBeTruthy()
      // Each lane cell lies beside the lane cell it widens, or across the corner of its bend.
      for (const { at: lane, cell } of lanesOf(grid)) {
        const [r, c] = cell.shoulderOf!.split(",").map(Number)
        expect(at(grid, [r, c])?.type, `lane at ${keyOf(lane)}`).not.toBe("empty")
        expect(Math.max(Math.abs(r - lane[0]), Math.abs(c - lane[1])), `lane at ${keyOf(lane)}`).toBe(1)
      }
      // Each corridor out of the fork walks a wide stretch before it reaches the next piece.
      const fork = cellsOf(grid).find(({ cell }) => cell.type === "room" && cell.roomType === "fork")!
      for (const dir of fork.cell.type === "empty" ? [] : fork.cell.dirs) {
        let cell: Cell = [fork.at[0] + MOVES[dir][0], fork.at[1] + MOVES[dir][1]]
        let from = dir
        let wide = false
        for (let here = at(grid, cell); here && here.type !== "empty"; here = at(grid, cell)) {
          if (here.shoulder) wide = true
          if (here.type === "room" && !isStop(here)) break
          const next = [...here.dirs].find(way => way !== OPPOSITE[from])
          if (!next) break
          cell = [cell[0] + MOVES[next][0], cell[1] + MOVES[next][1]]
          from = next
        }
        expect(wide, `way ${dir} of the fork`).toBe(true)
      }
    }
    const narrow = embed(drawnSketch(TWO_ARMS))
    expect(lanesOf(narrow)).toEqual([])
    expect(cellsOf(narrow).filter(({ cell }) => cell.type !== "empty" && cell.shoulder)).toEqual([])
  })

  it("the lane narrows to one cell at a door and at a drop", () => {
    const rows = ["E.S.S.S.G.S.S.S.SL>>>DS.S.S.S.S.T"]
    for (const seed of SEEDS) {
      const grid = embed(sketchWith(rows, { "0,8": { requiredKeyId: "door", tags: ["gate"] } }), { seed, wide: true })
      expect(lanesOf(grid).length).toBeGreaterThan(0)
      const narrowing = cellsOf(grid).filter(({ cell }) => narrowsLane(cell))
      expect(narrowing.some(({ cell }) => cell.type === "room" && cell.requiredKeyId)).toBe(true)
      expect(narrowing.some(({ cell }) => cell.type === "corridor" && cell.obstacle)).toBe(true)
      // Nothing beside a door or a run cell, nor beside a cell next to one, is widened.
      const close = new Set(narrowing.flatMap(({ at: cell }) => [cell, ...near(cell)].map(keyOf)))
      for (const key of close) {
        const cell = at(grid, key.split(",").map(Number) as Cell)
        expect(cell?.type !== "empty" && cell?.shoulder, `shoulder at ${key}`).toBeFalsy()
      }
      for (const { at: lane, cell } of lanesOf(grid)) {
        expect(close.has(cell.shoulderOf!), `lane at ${keyOf(lane)}`).toBe(false)
        expect(
          near(lane).some(n => narrowsLane(at(grid, n))),
          `lane at ${keyOf(lane)}`
        ).toBe(false)
      }
    }
  })

  it("a node selector widens only the corridor into that node", () => {
    const rows = ["E.S.S.S.S.S.S.S.S.S.T"]
    for (const seed of SEEDS) {
      const grid = embed(sketchWith(rows, { "0,10": { wideWayIn: true } }), { seed })
      const line = walkLine(grid)
      const asks = line.findIndex(cell => {
        const here = at(grid, cell)
        return here?.type === "room" && !!here.wideWayIn
      })
      const stops = line.flatMap((cell, i) => (at(grid, cell)?.type === "room" && i < asks ? [i] : []))
      const before = stops[stops.length - 1]
      const widened = new Set(lanesOf(grid).map(({ cell }) => cell.shoulderOf))
      expect(widened.size).toBeGreaterThan(0)
      line.forEach((cell, i) => {
        const inStretch = i >= before && i <= asks
        expect(widened.has(keyOf(cell)) && !inStretch, `lane beside ${keyOf(cell)}`).toBe(false)
        const here = at(grid, cell)
        if (!inStretch) expect(here?.type !== "empty" && here?.shoulder).toBeFalsy()
      })
    }
  })

  it("walks never step on a second lane", () => {
    for (const seed of SEEDS) {
      const grid = embed(drawnSketch(TWO_ARMS), { seed, wide: true })
      const lanes = new Set(lanesOf(grid).map(({ at: lane }) => keyOf(lane)))
      expect(lanes.size).toBeGreaterThan(0)
      for (const { at: cell, cell: here } of cellsOf(grid)) {
        if (here.type === "empty") continue
        if (lanes.has(keyOf(cell))) expect(here.dirs.size).toBe(0)
        for (const dir of here.dirs)
          expect(lanes.has(keyOf([cell[0] + MOVES[dir][0], cell[1] + MOVES[dir][1]])), keyOf(cell)).toBe(false)
      }
    }
  })

  it("a floor authored wide carves on the rooms engine and passes the site's checks", () => {
    const result = assembleFloor(
      "test",
      plainFloor({ pathPuzzles: 4, corridorWidth: 2 }),
      3,
      undefined,
      {},
      {
        engine: ROOMS_ENGINE,
      }
    )
    if (!result.success) throw new Error(JSON.stringify(result.reasons))
    expect(lanesOf(result.grid).length).toBeGreaterThan(0)
    expect(validateSite(result.grid)).toEqual({ valid: true })
  })

  it("every lane the carve lays was held by the layout, the stop before an asking node included", () => {
    const rows = ["E.F.S.S.S.S.S.S.S.T", "  .", "  S.S.S.S.F", "          .", "          S.S"]
    for (const seed of SEEDS) {
      const graph = floorGraph(sketchWith(rows, { "0,12": { wideWayIn: true } }), new Map())
      const layout = layoutFloor(graph, { seed, spread: 0 })
      if ("refused" in layout) throw new Error(layout.refused)
      const carved = carveLayout(layout)
      const [lr, lc] = layout.blocks.get(graph.entrance)!
      const [fr, fc] = carved.nodes.get(graph.entrance)!
      const held = new Set(layout.lanes.map(([r, c]) => keyOf([r + fr - lr, c + fc - lc])))
      const laid = lanesOf(carved.grid)
      expect(laid.length).toBeGreaterThan(2)
      for (const { at: lane } of laid) expect(held.has(keyOf(lane)), `lane at ${keyOf(lane)}`).toBe(true)
    }
  })
})
