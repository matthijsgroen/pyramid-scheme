import type { CellRect, Direction, FloorGrid } from "../../siteTypes"
import type { Cell } from "../state"
import { carveLayout } from "./carveLayout"
import { floorGraph, keyOf, type CellKey, type EmbedRoom } from "./graph"
import { layoutFloor } from "./layout"

export type { CellKey, EmbedRoom }

export type EmbedOptions = {
  seed: number
  spread: number
  /** The designed rooms by sketch node. */
  rooms: ReadonlyMap<CellKey, EmbedRoom>
  /** Sketch nodes the floor names by their place, which stay nodes on the laid floor however plain they look. */
  keep?: ReadonlySet<CellKey>
}

/** `slack` counts the strings the press left longer than their nodes need, before any spread. */
export type EmbedReport = { rows: number; cols: number; longestRoomToRoom: number; attempts: number; slack: number }

export type Embedded = {
  grid: FloorGrid
  /** Each designed room's inside of the ring, by sketch node, as `stampPrefab` takes it. */
  prefabRects: Map<CellKey, CellRect>
  /** Where each sketch node stands on the floor. */
  nodes: Map<CellKey, Cell>
  report: EmbedReport
}

/** A floor the layout found no room for: an attempt's retry, naming the piece. */
export type EmbedRefusal = { retry: []; refused: string }

/** How many layouts ran, the floor attempts they took, how many were refused and how many strings they left longer
 * than their nodes need, for `yarn layout-measure`. */
export const layoutTally = { layouts: 0, attempts: 0, refused: 0, slack: 0, sketchBare: 0 }

const MOVES: Record<Direction, Cell> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

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

/** The corridor cells that are bare floor: no stop, door, gate, drop or fork, so not a room, not part of a drop or
 * next to one, not next to a room, and leaving by at most two ways. */
export const bareCorridorCells = (grid: FloorGrid): number => {
  const at = (r: number, c: number) => grid.cells[r]?.[c]
  let bare = 0
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "corridor" || cell.obstacle || cell.openGate || cell.prefabRoom || cell.dirs.size > 2) return
      const near = Object.values(MOVES).map(([dr, dc]) => at(r + dr, c + dc))
      if (near.some(next => next?.type === "room" || (next?.type === "corridor" && next.obstacle))) return
      bare++
    })
  )
  return bare
}

/**
 * THE SKETCH GIVEN REAL SPACE, in three stages: the sketch read as a graph of pieces and the strings between them
 * (`floorGraph`), the pieces and strings given positions (`layoutFloor`), and the positions carved into a grid
 * (`carveLayout`). A floor the layout finds no room for is refused as an attempt's retry, naming the piece. Draws come
 * from the layout's own stream, so the passes' draws are untouched.
 */
export const embedFloor = (lattice: FloorGrid, opts: EmbedOptions): Embedded | EmbedRefusal => {
  layoutTally.layouts++
  const layout = layoutFloor(floorGraph(lattice, opts.rooms, opts.keep), opts)
  if ("refused" in layout) {
    layoutTally.attempts++
    layoutTally.refused++
    return { retry: [], refused: layout.refused }
  }
  layoutTally.attempts += layout.attempts
  layoutTally.slack += layout.slack
  layoutTally.sketchBare = bareCorridorCells(lattice)
  const { grid, prefabRects, nodes } = carveLayout(layout)
  return {
    grid,
    prefabRects,
    nodes,
    report: {
      rows: grid.rows,
      cols: grid.cols,
      longestRoomToRoom: longestRoomToRoom(grid),
      attempts: layout.attempts,
      slack: layout.slack,
    },
  }
}
