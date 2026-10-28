import { cellAt } from "./roomFootprint"
import type { CellRect, Direction, FloorGrid } from "./siteTypes"

export const STEP: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

export const inRect = (rect: CellRect, r: number, c: number): boolean =>
  r >= rect.top && r < rect.top + rect.rows && c >= rect.left && c < rect.left + rect.cols

const cached = new WeakMap<FloorGrid, ReadonlyMap<string, string>>()

/** Every cell of every grown room's rect, the node's own included, keyed `r,c` to its node's key. */
export const grownCells = (grid: FloorGrid): ReadonlyMap<string, string> => {
  const known = cached.get(grid)
  if (known) return known
  const owners = new Map<string, string>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room" || !cell.grownRoom) return
      const { top, left, rows, cols } = cell.grownRoom.rect
      for (let rr = top; rr < top + rows; rr++)
        for (let cc = left; cc < left + cols; cc++) owners.set(`${rr},${cc}`, `${r},${c}`)
    })
  )
  cached.set(grid, owners)
  return owners
}

/** Where each way out of a grown room leaves its rect: the last cell of the arm's straight run inside it. */
export const roomDoors = (
  grid: FloorGrid,
  r: number,
  c: number
): Partial<Record<Direction, readonly [number, number]>> => {
  const cell = cellAt(grid, r, c)
  if (cell.type !== "room" || !cell.grownRoom) return {}
  const { rect } = cell.grownRoom
  const doors: Partial<Record<Direction, readonly [number, number]>> = {}
  for (const dir of cell.dirs) {
    const [dr, dc] = STEP[dir]
    let at: readonly [number, number] = [r, c]
    while (inRect(rect, at[0] + dr, at[1] + dc)) at = [at[0] + dr, at[1] + dc]
    doors[dir] = at
  }
  return doors
}
