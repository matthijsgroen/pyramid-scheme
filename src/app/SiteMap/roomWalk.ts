import { STEP, inRect, prefabRoomAt, prefabRoomCells, roomDoors } from "@/game/roomShape"
import type { Direction, FloorGrid, PrefabRoom } from "@/game/siteTypes"
import { COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import type { StandingOffset } from "./standingSpot"

export type WalkPoint = { x: number; y: number; inRoom?: true }
export type RoomEnd = { door: Direction } | "stop"

type Cell = readonly [number, number]

const centreOf = ([r, c]: Cell): WalkPoint => {
  const { cx, cy } = cellCenter(r, c)
  return { x: cx, y: cy }
}

/** The cell a prefab room's node is drawn and met at: the prefab's stop. */
export const roomStop = (grid: FloorGrid, r: number, c: number): Cell | undefined => prefabRoomAt(grid, r, c)?.stop

/** The cells of a room's arms inside its rect, from the node to each door, the node's own included. */
const armCells = (grid: FloorGrid, [r, c]: Cell): Set<string> => {
  const cells = new Set([`${r},${c}`])
  for (const [dir, door] of Object.entries(roomDoors(grid, r, c)) as [Direction, Cell][]) {
    const [dr, dc] = STEP[dir]
    for (let at: Cell = [r, c]; at[0] !== door[0] || at[1] !== door[1];) {
      at = [at[0] + dr, at[1] + dc]
      cells.add(`${at[0]},${at[1]}`)
    }
  }
  return cells
}

/** The room's floor the walk may cross: its rect but what is blocked, its node and arms always. */
const freeCells = (grid: FloorGrid, node: Cell, room: PrefabRoom): Set<string> => {
  const blocked = new Set(room.blocked)
  const free = armCells(grid, node)
  const { top, left, rows, cols } = room.rect
  for (let r = top; r < top + rows; r++)
    for (let c = left; c < left + cols; c++) if (!blocked.has(`${r},${c}`)) free.add(`${r},${c}`)
  return free
}

type Box = { x0: number; y0: number; x1: number; y1: number }

/** A blocked cell as the walk sees it: its whole pitch, so the gap between two cells of one object is blocked too. */
const boxOf = ([r, c]: Cell): Box => {
  const { cx, cy } = cellCenter(r, c)
  return { x0: cx - COL_PITCH / 2, y0: cy - ROW_PITCH / 2, x1: cx + COL_PITCH / 2, y1: cy + ROW_PITCH / 2 }
}

/** Whether the segment passes through the OPEN interior of the box; grazing its boundary or a corner is allowed. */
const crosses = (a: WalkPoint, b: WalkPoint, box: Box): boolean => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  let t0 = 0
  let t1 = 1
  const clips: [number, number][] = [
    [-dx, a.x - box.x0],
    [dx, box.x1 - a.x],
    [-dy, a.y - box.y0],
    [dy, box.y1 - a.y],
  ]
  for (const [p, q] of clips) {
    if (p === 0) {
      if (q <= 0) return false
      continue
    }
    const t = q / p
    if (p < 0) t0 = Math.max(t0, t)
    else t1 = Math.min(t1, t)
  }
  return t1 - t0 > 1e-9
}

const keyOf = ([r, c]: Cell) => `${r},${c}`

/** Whether a leg between two cell centres may be walked: it crosses no blocked cell and squeezes through no corner
 * that two blocked cells meet at from opposite sides. */
const legal = (free: ReadonlySet<string>, from: Cell, to: Cell): boolean => {
  const a = centreOf(from)
  const b = centreOf(to)
  const [r0, r1] = [Math.min(from[0], to[0]), Math.max(from[0], to[0])]
  const [c0, c1] = [Math.min(from[1], to[1]), Math.max(from[1], to[1])]
  const blocked = (r: number, c: number) => !free.has(`${r},${c}`)
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) if (blocked(r, c) && crosses(a, b, boxOf([r, c]))) return false
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  for (let r = r0; r < r1; r++)
    for (let c = c0; c < c1; c++) {
      const pinched = (blocked(r, c) && blocked(r + 1, c + 1)) || (blocked(r, c + 1) && blocked(r + 1, c))
      if (!pinched) continue
      const corner = { x: cellCenter(r, c).cx + COL_PITCH / 2, y: cellCenter(r, c).cy + ROW_PITCH / 2 }
      const off = Math.abs((b.x - a.x) * (corner.y - a.y) - (b.y - a.y) * (corner.x - a.x)) / length
      if (off < 1e-6) return false
    }
  return true
}

/** The shortest walk from `a` to `b` over `free`: straight legs between cell centres, each one `legal`. */
const shortestWalk = (free: ReadonlySet<string>, a: Cell, b: Cell): Cell[] | undefined => {
  const cells = [...free].map(key => key.split(",").map(Number) as unknown as Cell)
  const from = cells.findIndex(cell => keyOf(cell) === keyOf(a))
  const to = cells.findIndex(cell => keyOf(cell) === keyOf(b))
  if (from < 0 || to < 0) return undefined
  const dist = cells.map(() => Infinity)
  const prev = cells.map(() => -1)
  const done = cells.map(() => false)
  dist[from] = 0
  for (;;) {
    let u = -1
    cells.forEach((_, i) => {
      if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i
    })
    if (u < 0 || u === to) break
    done[u] = true
    const p = centreOf(cells[u])
    cells.forEach((cell, v) => {
      if (done[v]) return
      const q = centreOf(cell)
      const d = dist[u] + Math.hypot(q.x - p.x, q.y - p.y)
      if (d < dist[v] - 1e-9 && legal(free, cells[u], cell)) {
        dist[v] = d
        prev[v] = u
      }
    })
  }
  if (dist[to] === Infinity) return undefined
  const walk: Cell[] = []
  for (let at = to; at >= 0; at = prev[at]) walk.unshift(cells[at])
  return walk
}

/** The walk between two ends of a prefab room: the shortest way over its free cells in straight legs that cross
 * nothing blocked. Ends the room's own floor does not join are a broken room: an error while developing, a straight
 * line in play. */
export const roomPath = (grid: FloorGrid, node: Cell, from: RoomEnd, to: RoomEnd): WalkPoint[] => {
  const room = prefabRoomAt(grid, node[0], node[1])
  if (!room) return []
  const doors = roomDoors(grid, node[0], node[1])
  const endCell = (end: RoomEnd): Cell => (end === "stop" ? room.stop : (doors[end.door] ?? node))
  const a = endCell(from)
  const b = endCell(to)
  const inRoom = (cell: Cell): WalkPoint => ({ ...centreOf(cell), inRoom: true })
  if (a[0] === b[0] && a[1] === b[1]) return [inRoom(a)]
  const walk = shortestWalk(freeCells(grid, node, room), a, b)
  if (walk) return walk.map(inRoom)
  if (import.meta.env?.DEV)
    throw new Error(`[roomWalk] ${room.name} at ${keyOf(node)}: no way from ${keyOf(a)} to ${keyOf(b)}`)
  return [inRoom(a), inRoom(b)]
}

/** The direction of the arm whose straight run inside the room holds this cell. */
const armOf = (grid: FloorGrid, node: Cell, at: Cell): Direction | undefined => {
  const room = prefabRoomAt(grid, node[0], node[1])
  if (!room) return undefined
  for (const dir of Object.keys(roomDoors(grid, node[0], node[1])) as Direction[]) {
    const [dr, dc] = STEP[dir]
    let cell: Cell = node
    while (inRect(room.rect, cell[0] + dr, cell[1] + dc)) {
      cell = [cell[0] + dr, cell[1] + dc]
      if (cell[0] === at[0] && cell[1] === at[1]) return dir
    }
  }
  return undefined
}

const nodeOf = (grid: FloorGrid, at: Cell): Cell | undefined => {
  const key = prefabRoomCells(grid).get(`${at[0]},${at[1]}`)
  return key ? (key.split(",").map(Number) as unknown as Cell) : undefined
}

const stepDir = (from: Cell, to: Cell): Direction | undefined =>
  (Object.keys(STEP) as Direction[]).find(dir => from[0] + STEP[dir][0] === to[0] && from[1] + STEP[dir][1] === to[1])

/** The door a route crosses stepping from `outside` to `inside` the room: the side it steps over, a node on the rect's
 * edge being its own door. A hop that is no single step falls back to the arm `inside` stands on. */
const endFor = (grid: FloorGrid, node: Cell, inside: Cell, outside: Cell): RoomEnd => {
  const step = stepDir(inside, outside)
  if (step && roomDoors(grid, node[0], node[1])[step]) return { door: step }
  const door = armOf(grid, node, inside)
  return door ? { door } : "stop"
}

/** The pixel points the explorer walks for a route: cell centres (a wide corridor's on its centre line), the first and last at their standing spots, each stretch
 * through a prefab room replaced by its walk round what stands in it. A route that starts or ends in a prefab room starts
 * or ends at its stop, the spot he stands on in it. */
export const walkPoints = (
  grid: FloorGrid,
  route: ReadonlyArray<Cell>,
  standAt: (r: number, c: number) => StandingOffset
): WalkPoint[] => {
  const points: WalkPoint[] = []
  let i = 0
  while (i < route.length) {
    const node = nodeOf(grid, route[i])
    if (node) {
      let j = i
      while (j + 1 < route.length) {
        const next = nodeOf(grid, route[j + 1])
        if (!next || next[0] !== node[0] || next[1] !== node[1]) break
        j++
      }
      const from = i === 0 ? "stop" : endFor(grid, node, route[i], route[i - 1])
      const to = j === route.length - 1 ? "stop" : endFor(grid, node, route[j], route[j + 1])
      points.push(...roomPath(grid, node, from, to))
      i = j + 1
      continue
    }
    const { cx, cy } = cellCenter(route[i][0], route[i][1])
    if (i === 0 || i === route.length - 1) {
      const { dx, dy } = standAt(route[i][0], route[i][1])
      points.push({ x: cx + dx, y: cy + dy })
    } else {
      points.push({ x: cx, y: cy })
    }
    i++
  }
  return points
}

/** One step for a corridor hop; a hop inside a room counts its length in cell pitches. */
export const stepsBetween = (a: WalkPoint, b: WalkPoint): number =>
  a.inRoom || b.inRoom ? Math.hypot((a.x - b.x) / COL_PITCH, (a.y - b.y) / ROW_PITCH) : 1

export const walkSteps = (points: readonly WalkPoint[]): number =>
  points.slice(1).reduce((sum, p, i) => sum + stepsBetween(points[i], p), 0)

/** Where a cell's marker is drawn: a prefab room's node at its stop, an absorbed arm cell at its door. */
export const markerCell = (grid: FloorGrid, r: number, c: number): Cell => {
  const node = nodeOf(grid, [r, c])
  if (!node) return [r, c]
  if (node[0] === r && node[1] === c) return roomStop(grid, r, c) ?? [r, c]
  const dir = armOf(grid, node, [r, c])
  return (dir && roomDoors(grid, node[0], node[1])[dir]) || [r, c]
}
