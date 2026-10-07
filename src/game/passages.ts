import type { Direction, FloorGrid, GridCell } from "./siteTypes"

// A NARROW PASSAGE: a gate empty hands alone open, a wall with a crack in one cell. It is a gate to every walk; play
// never lets anyone stand in it, and takes the explorer through by its prompt (useSiteNavigation).

export type Place = readonly [number, number]

const STEP: Record<Direction, Place> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** Each door whose key `passages` names gains the passage it was bound to. Only those cells change: no wall, `dirs`
 * or slot moves, so the carve the checks read is the carve the player walks. */
export const withPassages = (grid: FloorGrid, passages: ReadonlyMap<string, string>): FloorGrid => {
  if (passages.size === 0) return grid
  let changed = false
  const cells = grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (cell.type !== "room" || !cell.tags?.includes("gate") || cell.requiredKeyId === undefined) return cell
      const realisation = passages.get(cell.requiredKeyId)
      if (realisation === undefined) return cell
      changed = true
      return { ...cell, passage: { realisation } }
    })
  )
  return changed ? { ...grid, cells } : grid
}

/** The two cells a passage joins, read off its own ways in the order its `dirs` hold them; undefined for a cell that
 * is no passage, or one with other than two ways. */
export const passageSides = (grid: FloorGrid, row: number, col: number): readonly [Place, Place] | undefined => {
  const cell = grid.cells[row]?.[col]
  if (cell?.type !== "room" || !cell.passage || cell.dirs.size !== 2) return undefined
  const [a, b] = [...cell.dirs].map((dir): Place => [row + STEP[dir][0], col + STEP[dir][1]])
  return [a, b]
}

/** The way from a cell to its neighbour. */
export const headingOf = (from: Place, to: Place): Direction =>
  to[0] < from[0] ? "n" : to[0] > from[0] ? "s" : to[1] > from[1] ? "e" : "w"

export type PassageCrossing = { near: Place; via: Place; far: Place; realisation: string }

/** The crossing of the passage at (row, col) from the first of its sides the explorer can stand on, through the wall's
 * own cell, to the other; undefined where he can stand on neither. Both are standable only where a gate closes a
 * loop; he starts from the first. */
export const passageCrossing = (
  grid: FloorGrid,
  row: number,
  col: number,
  canStand: (row: number, col: number) => boolean
): PassageCrossing | undefined => {
  const cell = grid.cells[row]?.[col]
  const sides = passageSides(grid, row, col)
  if (!sides || cell?.type !== "room" || !cell.passage) return undefined
  const near = sides.find(([r, c]) => canStand(r, c))
  if (!near) return undefined
  return { near, via: [row, col], far: near === sides[0] ? sides[1] : sides[0], realisation: cell.passage.realisation }
}
