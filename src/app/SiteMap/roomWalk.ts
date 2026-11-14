import { STEP, inRect, prefabRoomAt, prefabRoomCells, roomDoors, type RoomDoor } from "@/game/roomShape"
import type { FloorGrid, PrefabRoom } from "@/game/siteTypes"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { CELL, COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import type { StandingOffset } from "./standingSpot"

export type WalkPoint = { x: number; y: number; inRoom?: true }
/** A door by its place on the ring, a cell of the room's floor, or the room's stop. */
export type RoomEnd = { doorAt: Cell } | { cell: Cell } | "stop"

type Cell = readonly [number, number]

const centreOf = ([r, c]: Cell): WalkPoint => {
  const { cx, cy } = cellCenter(r, c)
  return { x: cx, y: cy }
}

/** The cell a prefab room's node is drawn and met at: the prefab's stop. */
export const roomStop = (grid: FloorGrid, r: number, c: number): Cell | undefined => prefabRoomAt(grid, r, c)?.stop

/** The cells of a room's straight arms inside its rect, from the node to each door in line with it, the node's own
 * included. */
const armCells = (grid: FloorGrid, [r, c]: Cell): Set<string> => {
  const cells = new Set([`${r},${c}`])
  for (const door of roomDoors(grid, r, c)) {
    const dir = door.side
    if (STEP[dir][0] === 0 ? door.inside[0] !== r : door.inside[1] !== c) continue
    const [dr, dc] = STEP[dir]
    for (let at: Cell = [r, c]; at[0] !== door.inside[0] || at[1] !== door.inside[1];) {
      at = [at[0] + dr, at[1] + dc]
      cells.add(`${at[0]},${at[1]}`)
    }
  }
  return cells
}

/** The room's floor the walk may cross: its rect but what is blocked, its node and arms always, and the cell somebody
 * stands on (`drawnAt`) only where nothing else joins the stop to a door. */
export const freeCells = (grid: FloorGrid, node: Cell, room: PrefabRoom): Set<string> => {
  const free = floorCells(grid, node, room)
  // Somebody standing in the room is walked round as well, unless the room has no other way from its stop to a door.
  const actor = drawnAt(grid, node)?.actor
  if (actor && keepsJoined(grid, node, room, free, actor)) free.delete(keyOf(actor))
  return free
}

/** Whether the room's stop still reaches every door with `cell` taken out of `free`. */
const keepsJoined = (grid: FloorGrid, node: Cell, room: PrefabRoom, free: ReadonlySet<string>, cell: Cell): boolean => {
  const without = new Set(free)
  without.delete(keyOf(cell))
  return joins(
    without,
    room.stop,
    roomDoors(grid, ...node).map(door => door.inside)
  )
}

/** The room's floor nobody stands on: its rect but what is blocked or stands in its middle, its node and arms always. */
const floorCells = (grid: FloorGrid, node: Cell, room: PrefabRoom): Set<string> => {
  const blocked = new Set(room.blocked)
  const free = armCells(grid, node)
  const { top, left, rows, cols } = room.rect
  for (let r = top; r < top + rows; r++)
    for (let c = left; c < left + cols; c++) if (!blocked.has(`${r},${c}`)) free.add(`${r},${c}`)
  // What stands in the room's middle is walked round, whether or not a straight arm leads through it: its objects, and
  // the node's own art (a lever, a torch) on its mechanism place, which is worked from the stop, never stood in.
  for (const object of room.objects)
    if (object.layer !== "ground")
      for (let r = object.top; r < object.top + object.rows; r++)
        for (let c = object.left; c < object.left + object.cols; c++) free.delete(`${r},${c}`)
  if (room.nodeArt) free.delete(keyOf(room.nodeArt))
  return free
}

/** Whether `free` joins `from` to every one of `ends`, cell to cell. */
const joins = (free: ReadonlySet<string>, from: Cell, ends: readonly Cell[]): boolean => {
  const seen = new Set([keyOf(from)])
  const queue = [from]
  for (let i = 0; i < queue.length; i++)
    for (const [dr, dc] of Object.values(STEP)) {
      const next: Cell = [queue[i][0] + dr, queue[i][1] + dc]
      if (free.has(keyOf(next)) && !seen.has(keyOf(next))) {
        seen.add(keyOf(next))
        queue.push(next)
      }
    }
  return ends.every(end => seen.has(keyOf(end)))
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
  const endCell = (end: RoomEnd): Cell =>
    end === "stop"
      ? room.stop
      : "cell" in end
        ? end.cell
        : (doors.find(door => keyOf(door.at) === keyOf(end.doorAt))?.inside ?? node)
  const a = endCell(from)
  const b = endCell(to)
  const inRoom = (cell: Cell): WalkPoint => ({ ...centreOf(cell), inRoom: true })
  // At the stop he stands where `stopPoint` says: a walk to it ends there, one from it starts there.
  const front = room.nodeArt && { ...stopPoint(room), inRoom: true as const }
  const atStop = (points: WalkPoint[]): WalkPoint[] =>
    front ? [...(from === "stop" ? [front] : []), ...points, ...(to === "stop" ? [front] : [])] : points
  if (a[0] === b[0] && a[1] === b[1])
    return from === "stop" && to === "stop" ? [front || inRoom(a)] : atStop([inRoom(a)])
  const walk = shortestWalk(freeCells(grid, node, room), a, b)
  if (walk) return atStop(walk.map(inRoom))
  if (import.meta.env?.DEV)
    throw new Error(`[roomWalk] ${room.name} at ${keyOf(node)}: no way from ${keyOf(a)} to ${keyOf(b)}`)
  return atStop([inRoom(a), inRoom(b)])
}

/** How far below the centre of a lever's or torch's cell he stands to work it: on its bottom edge, in front of its foot. */
const IN_FRONT_OF_ART = CELL / 2

/** Where he stands at a designed room's stop: in front of the foot of its node art (a lever, a torch) where it has
 * some, so he is drawn working it, else on the stop. */
export const stopPoint = (room: PrefabRoom): WalkPoint => {
  const { x, y } = centreOf(room.nodeArt ?? room.stop)
  return { x, y: room.nodeArt ? y + IN_FRONT_OF_ART : y }
}

/** The door whose straight arm from the node holds this cell. */
const armOf = (grid: FloorGrid, node: Cell, at: Cell): RoomDoor | undefined => {
  const room = prefabRoomAt(grid, node[0], node[1])
  if (!room) return undefined
  for (const door of roomDoors(grid, node[0], node[1])) {
    const [dr, dc] = STEP[door.side]
    let cell: Cell = node
    while (inRect(room.rect, cell[0] + dr, cell[1] + dc)) {
      cell = [cell[0] + dr, cell[1] + dc]
      if (keyOf(cell) === keyOf(at) && keyOf(cell) === keyOf(door.inside)) return door
      if (keyOf(cell) === keyOf(door.inside)) break
      if (keyOf(cell) === keyOf(at)) {
        const inLine = dr === 0 ? door.inside[0] === node[0] : door.inside[1] === node[1]
        if (inLine) return door
      }
    }
  }
  return undefined
}

const nodeOf = (grid: FloorGrid, at: Cell): Cell | undefined => {
  const key = prefabRoomCells(grid).get(`${at[0]},${at[1]}`)
  return key ? (key.split(",").map(Number) as unknown as Cell) : undefined
}

/** The door a route crosses stepping into the room at `node` from `outside`: the door place nearest `outside`. */
export const doorFacing = (grid: FloorGrid, node: Cell, outside: Cell): RoomDoor | undefined => {
  const doors = roomDoors(grid, node[0], node[1])
  const far = (door: RoomDoor) => Math.abs(door.at[0] - outside[0]) + Math.abs(door.at[1] - outside[1])
  return [...doors].sort((a, b) => far(a) - far(b))[0]
}

const endFor = (grid: FloorGrid, node: Cell, outside: Cell): RoomEnd => {
  const door = doorFacing(grid, node, outside)
  return door ? { doorAt: door.at } : "stop"
}

/** The pixel points the explorer walks for a route: cell centres (a wide corridor's on its centre line), the first and last at their standing spots, each stretch
 * through a prefab room replaced by its walk round what stands in it. A route that starts or ends in a prefab room starts
 * or ends at its stop, the spot he stands on in it, or at `fromWaypoint` / `toWaypoint` when he sets out from or comes
 * to rest on one. */
export const walkPoints = (
  grid: FloorGrid,
  route: ReadonlyArray<Cell>,
  standAt: (r: number, c: number) => StandingOffset,
  fromWaypoint?: Cell,
  toWaypoint?: Cell
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
      const from: RoomEnd = i > 0 ? endFor(grid, node, route[i - 1]) : fromWaypoint ? { cell: fromWaypoint } : "stop"
      const to: RoomEnd =
        j < route.length - 1 ? endFor(grid, node, route[j + 1]) : toWaypoint ? { cell: toWaypoint } : "stop"
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

/** Where a cell's marker is drawn: a prefab room's node at its stop, a cell something used is drawn on at itself
 * (`drawnOwner`), any other absorbed arm cell at its door. */
export const markerCell = (grid: FloorGrid, r: number, c: number): Cell => {
  const node = nodeOf(grid, [r, c])
  if (!node) return [r, c]
  if (node[0] === r && node[1] === c) return drawnAt(grid, node)?.marker ?? [r, c]
  if (drawnOwner(grid, r, c)) return [r, c]
  return armOf(grid, node, [r, c])?.inside ?? [r, c]
}

/** The cells a designed room draws what is used in it on: its node art (a lever, a chest) on its place for it, else at
 * the stop; its marker at the stop; somebody its family has in it north of the stop in a room fit for them, else beside
 * the stop on the first free cell beside it (east, west, north, south, then the corners from the north) the stop
 * reaches every door without. */
export type DrawnCells = { art: Cell; marker: Cell; actor?: Cell }

const BESIDE: readonly Cell[] = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [-1, -1],
  [1, 1],
  [1, -1],
]

const actorBeside = (grid: FloorGrid, node: Cell, room: PrefabRoom): Cell | undefined => {
  const beside = BESIDE.map(([dr, dc]): Cell => [room.stop[0] + dr, room.stop[1] + dc])
  const floor = floorCells(grid, node, room)
  const free = beside.find(at => floor.has(keyOf(at)) && keepsJoined(grid, node, room, floor, at))
  if (free) return free
  const blocked = new Set(room.blocked)
  return beside.slice(0, 2).find(([r, c]) => inRect(room.rect, r, c) && !blocked.has(`${r},${c}`))
}

export const drawnAt = (grid: FloorGrid, node: Cell): DrawnCells | undefined => {
  const room = prefabRoomAt(grid, node[0], node[1])
  if (!room) return undefined
  const cell = grid.cells[node[0]]?.[node[1]]
  const family = cell?.type === "room" ? cell.family : undefined
  const actor =
    family && getFamilyPlugin(family)?.meta.actor ? (room.actor ?? actorBeside(grid, node, room)) : undefined
  return { art: room.nodeArt ?? room.stop, marker: room.stop, ...(actor ? { actor } : {}) }
}

/** WHAT IS DRAWN AND USED IS TAPPED WHERE IT IS DRAWN: the node of the designed room that draws something used on r,c
 * (`drawnAt`); a tap there is a tap on that node. */
export const drawnOwner = (grid: FloorGrid, r: number, c: number): Cell | undefined => {
  const node = nodeOf(grid, [r, c])
  const drawn = node && drawnAt(grid, node)
  return drawn && [drawn.art, drawn.marker, drawn.actor].some(at => at?.[0] === r && at[1] === c) ? node : undefined
}
