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

/** How the walk sees a cell of a prefab room: `inner` is floor the room's own walk crosses and nobody stops on, its
 * `node` stands for the room, a `door` place in use is where a way meets it. Undefined for any other cell. */
export const roomPlaceOf = (grid: FloorGrid, r: number, c: number): "inner" | "node" | "door" | undefined => {
  const key = `${r},${c}`
  const owner = prefabRoomCells(grid).get(key)
  if (owner !== undefined) return owner === key ? "node" : "inner"
  return roomDoorCells(grid).has(key) ? "door" : undefined
}

const doorsCached = new WeakMap<FloorGrid, ReadonlySet<string>>()
const roomDoorCells = (grid: FloorGrid): ReadonlySet<string> => {
  const known = doorsCached.get(grid)
  if (known) return known
  const doors = new Set<string>()
  for (const row of grid.cells)
    for (const cell of row)
      if (cell.type !== "empty" && cell.prefabRoom) for (const [r, c] of cell.prefabRoom.doors) doors.add(`${r},${c}`)
  doorsCached.set(grid, doors)
  return doors
}

/** The side of `rect` a door place on its ring stands on. */
export const sideOf = (rect: CellRect, [r, c]: readonly [number, number]): Direction =>
  r < rect.top ? "n" : r >= rect.top + rect.rows ? "s" : c < rect.left ? "w" : "e"

export type RoomDoor = { at: readonly [number, number]; side: Direction; inside: readonly [number, number] }

/** Where each way out of a prefab room leaves its rect: the door place on the ring, its side, and the cell inside it. */
export const roomDoors = (grid: FloorGrid, r: number, c: number): RoomDoor[] => {
  const room = prefabRoomAt(grid, r, c)
  if (!room) return []
  return room.doors.map(at => {
    const side = sideOf(room.rect, at)
    return { at, side, inside: [at[0] - STEP[side][0], at[1] - STEP[side][1]] }
  })
}
