import { cellAt } from "./roomFootprint"
import type { CellRect, Direction, FloorGrid, PrefabRoom } from "./siteTypes"

export const STEP: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

export const inRect = (rect: CellRect, r: number, c: number): boolean =>
  r >= rect.top && r < rect.top + rect.rows && c >= rect.left && c < rect.left + rect.cols

/** The designed room laid over the node at r,c, a room or a corridor's end, if one is. */
export const prefabRoomAt = (grid: FloorGrid, r: number, c: number): PrefabRoom | undefined => {
  const cell = cellAt(grid, r, c)
  return cell.type === "empty" ? undefined : cell.prefabRoom
}

const cached = new WeakMap<FloorGrid, ReadonlyMap<string, string>>()

/** Every cell of every prefab room's rect, the node's own included, keyed `r,c` to its node's key. */
export const prefabRoomCells = (grid: FloorGrid): ReadonlyMap<string, string> => {
  const known = cached.get(grid)
  if (known) return known
  const owners = new Map<string, string>()
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "empty" || !cell.prefabRoom) return
      const { top, left, rows, cols } = cell.prefabRoom.rect
      for (let rr = top; rr < top + rows; rr++)
        for (let cc = left; cc < left + cols; cc++) owners.set(`${rr},${cc}`, `${r},${c}`)
    })
  )
  cached.set(grid, owners)
  return owners
}

/** Where each way out of a prefab room leaves its rect: the cell inside the door place that way out uses. */
export const roomDoors = (
  grid: FloorGrid,
  r: number,
  c: number
): Partial<Record<Direction, readonly [number, number]>> => {
  const room = prefabRoomAt(grid, r, c)
  if (!room) return {}
  const doors: Partial<Record<Direction, readonly [number, number]>> = {}
  for (const [dir, [dr, dc]] of Object.entries(room.doors) as [Direction, readonly [number, number]][])
    doors[dir] = [dr - STEP[dir][0], dc - STEP[dir][1]]
  return doors
}
