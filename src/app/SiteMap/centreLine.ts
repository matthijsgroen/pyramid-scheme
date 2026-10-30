import { cellAt } from "@/game/roomFootprint"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import { DIR_MOVES, OPPOSITE_DIR } from "./corridorRuns"
import { COL_PITCH, ROW_PITCH } from "./mapScale"

export type CentreOffset = { readonly dx: number; readonly dy: number }

const ON_CENTRE: CentreOffset = { dx: 0, dy: 0 }

const half = (dirs: readonly Direction[]): CentreOffset => ({
  dx: dirs.reduce((sum, dir) => sum + (DIR_MOVES[dir][1] * COL_PITCH) / 2, 0),
  dy: dirs.reduce((sum, dir) => sum + (DIR_MOVES[dir][0] * ROW_PITCH) / 2, 0),
})

/** Where the walk crosses a cell of a wide corridor, from its centre: the centre line between its two lanes, half a
 * cell toward its `shoulder`. On a bend, half a cell toward both its ways where the shoulder names one of them (the
 * second lane runs on the inside), else half a cell away from both. On every other cell, its centre. */
export const centreLine = (grid: FloorGrid, r: number, c: number): CentreOffset => {
  const cell = cellAt(grid, r, c)
  if (cell.type === "empty" || !cell.shoulder) return ON_CENTRE
  const ways = [...cell.dirs]
  const bend = ways.length === 2 && OPPOSITE_DIR[ways[0]] !== ways[1]
  if (!bend) return half([cell.shoulder])
  return half(cell.dirs.has(cell.shoulder) ? ways : ways.map(dir => OPPOSITE_DIR[dir]))
}
