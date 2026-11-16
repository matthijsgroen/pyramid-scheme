import type { Direction, FloorGrid, GridCell } from "../siteTypes"

const STEP: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const BACK: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

const withoutWay = (cell: GridCell, dir: Direction): GridCell => {
  if (cell.type === "empty") return cell
  const dirs = new Set(cell.dirs)
  dirs.delete(dir)
  return cell.type === "room" && cell.exits
    ? { ...cell, dirs, exits: cell.exits.filter(exit => exit.dir !== dir) }
    : { ...cell, dirs }
}

const markedCells = (grid: FloorGrid) =>
  new Set([grid.entrancePos, grid.exitPos, ...Object.values(grid.staircases)].map(([r, c]) => `${r},${c}`))

// The one way out of a plain corridor dead end — no drop, gate, designed room's floor, hidden way, stair, entrance or
// exit on it, no drop's lip beside it — or nothing where the cell is not one.
const bareDeadEnd = (
  cells: ReadonlyArray<ReadonlyArray<GridCell>>,
  marked: ReadonlySet<string>,
  r: number,
  c: number
): Direction | undefined => {
  const cell = cells[r][c]
  if (cell.type !== "corridor" || cell.dirs.size !== 1 || marked.has(`${r},${c}`)) return undefined
  if (cell.obstacle || cell.openGate || cell.prefabRoom || cell.hidden) return undefined
  const lip = Object.values(STEP).some(([dr, dc]) => {
    const near = cells[r + dr]?.[c + dc]
    return near?.type === "corridor" && near.obstacle !== undefined
  })
  return lip ? undefined : [...cell.dirs][0]
}

/** Every corridor dead end on the floor that leads to nothing (`bareDeadEnd`), as `r,c`. */
export const waysToNothing = (grid: FloorGrid): string[] => {
  const marked = markedCells(grid)
  return grid.cells.flatMap((row, r) =>
    row.flatMap((_, c) => (bareDeadEnd(grid.cells, marked, r, c) ? [`${r},${c}`] : []))
  )
}

/**
 * NO CORRIDOR LEADS TO NOTHING. A plain corridor cell with one way out — no drop, no gate, no designed room's floor,
 * nothing hidden, no stair, entrance or exit on it, and no drop's lip beside it — is ground the player walks to and
 * finds empty, so it is taken off, and the cell behind it is read again, until the corridor ends at something.
 * Rooms are never taken: a room is something. Nor is any ground of a region with no room but doors in it: a region with
 * nothing in it is a fault the lock's walk has to see (`walkFloorLock`'s `regionLost`), not one to cut out of sight.
 */
export const trimBareTails = (grid: FloorGrid): FloorGrid => {
  const marked = markedCells(grid)
  const cells = grid.cells.map(row => [...row])
  // The regions holding a room that is no door: a door is the way in, not something found there.
  const roomed = new Set(
    cells.flatMap(row =>
      row.flatMap(cell => (cell.type === "room" && cell.region && !cell.requiredKeyId ? [cell.region] : []))
    )
  )
  const bareWay = (r: number, c: number): Direction | undefined => {
    const cell = cells[r][c]
    return cell.type === "corridor" && cell.region && !roomed.has(cell.region)
      ? undefined
      : bareDeadEnd(cells, marked, r, c)
  }
  let trimmed = false
  for (let r0 = 0; r0 < grid.rows; r0++)
    for (let c0 = 0; c0 < grid.cols; c0++)
      for (let [r, c] = [r0, c0], way = bareWay(r, c); way !== undefined; way = bareWay(r, c)) {
        const [dr, dc] = STEP[way]
        cells[r][c] = { type: "empty" }
        cells[r + dr][c + dc] = withoutWay(cells[r + dr][c + dc], BACK[way])
        ;[r, c] = [r + dr, c + dc]
        trimmed = true
      }
  return trimmed ? { ...grid, cells } : grid
}
