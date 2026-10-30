import type { CellRect, FloorGrid } from "../../siteTypes"
import type { Cell } from "../state"
import { carveLayout } from "./carveLayout"
import { floorGraph, keyOf, MOVES, type CellKey, type EmbedRoom } from "./graph"
import { layoutFloor } from "./layout"

export type { CellKey, EmbedRoom }

export type EmbedOptions = {
  seed: number
  spread: number
  /** The designed rooms by sketch node. */
  rooms: ReadonlyMap<CellKey, EmbedRoom>
  /** Sketch nodes the floor names by their place, which stay nodes on the laid floor however plain they look. */
  keep?: ReadonlySet<CellKey>
  /** Every corridor of the floor is wide (`corridorWidth: 2`). */
  wide?: boolean
}

/** `slack` counts the strings the press left longer than their stops need, before any spread, and `pushes` the
 * rounds the push took. */
export type EmbedReport = { rows: number; cols: number; longestRoomToRoom: number; slack: number; pushes: number }

export type Embedded = {
  grid: FloorGrid
  /** Each designed room's inside of the ring, by sketch node, as `stampPrefab` takes it. */
  prefabRects: Map<CellKey, CellRect>
  /** Where each sketch node stands on the floor. */
  nodes: Map<CellKey, Cell>
  /** Which sketch cell each corridor cell of a string stands for, by floor cell. */
  sources: Map<CellKey, CellKey>
  report: EmbedReport
}

/** A floor the layout found no room for: an attempt's retry, naming the piece. */
export type EmbedRefusal = { retry: []; refused: string }

/** The rooms' longest walk from one room to the next over corridor alone. */
export const longestRoomToRoom = (grid: FloorGrid): number => {
  let longest = 0
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room") return
      const seen = new Set([keyOf([r, c])])
      let frontier: Cell[] = [[r, c]]
      for (let d = 1; frontier.length; d++) {
        const next: Cell[] = []
        for (const at of frontier) {
          const here = grid.cells[at[0]][at[1]]
          if (here.type === "empty" || (here.type === "room" && d > 1)) continue
          for (const dir of here.dirs) {
            const to: Cell = [at[0] + MOVES[dir][0], at[1] + MOVES[dir][1]]
            if (seen.has(keyOf(to))) continue
            seen.add(keyOf(to))
            if (grid.cells[to[0]][to[1]].type === "room") longest = Math.max(longest, d)
            next.push(to)
          }
        }
        frontier = next
      }
    })
  )
  return longest
}

/**
 * THE SKETCH GIVEN REAL SPACE, in three stages: the sketch read as a graph of pieces and the strings between them
 * (`floorGraph`), the pieces and strings given positions (`layoutFloor`), and the positions carved into a grid
 * (`carveLayout`). A floor the layout finds no room for is refused as an attempt's retry, naming the piece. Draws come
 * from the layout's own stream, so the passes' draws are untouched.
 */
export const embedFloor = (lattice: FloorGrid, opts: EmbedOptions): Embedded | EmbedRefusal => {
  const layout = layoutFloor(floorGraph(lattice, opts.rooms, opts.keep, opts.wide), opts)
  if ("refused" in layout) return { retry: [], refused: layout.refused }
  const { grid, prefabRects, nodes, sources } = carveLayout(layout)
  return {
    grid,
    prefabRects,
    nodes,
    sources,
    report: {
      rows: grid.rows,
      cols: grid.cols,
      longestRoomToRoom: longestRoomToRoom(grid),
      slack: layout.slack,
      pushes: layout.pushes,
    },
  }
}
