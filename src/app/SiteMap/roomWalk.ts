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

// Side to side, and corner to corner past two free sides.
const STEPS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, 1],
  [0, -1],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]

/** The shortest run of cells from `a` to `b` over `free`, each step as long as it is on the map. */
const cellRun = (free: ReadonlySet<string>, a: Cell, b: Cell): Cell[] => {
  const key = ([r, c]: Cell) => `${r},${c}`
  const dist = new Map<string, number>([[key(a), 0]])
  const prev = new Map<string, Cell>()
  const cells = new Map<string, Cell>([[key(a), a]])
  const done = new Set<string>()
  for (;;) {
    let at: string | undefined
    for (const [k, d] of dist) if (!done.has(k) && (at === undefined || d < dist.get(at)!)) at = k
    if (at === undefined || at === key(b)) break
    done.add(at)
    const [r, c] = cells.get(at)!
    for (const [dr, dc] of STEPS) {
      const next: Cell = [r + dr, c + dc]
      if (!free.has(key(next)) || done.has(key(next))) continue
      if (dr !== 0 && dc !== 0 && (!free.has(`${r + dr},${c}`) || !free.has(`${r},${c + dc}`))) continue
      const d = dist.get(at)! + Math.hypot(dr * ROW_PITCH, dc * COL_PITCH)
      if (d >= (dist.get(key(next)) ?? Infinity)) continue
      dist.set(key(next), d)
      prev.set(key(next), [r, c])
      cells.set(key(next), next)
    }
  }
  if (!dist.has(key(b))) return [a, b]
  const run: Cell[] = [b]
  for (let at = prev.get(key(b)); at; at = prev.get(key(at))) run.unshift(at)
  return run
}

/** The walk between two ends of a prefab room: the shortest run of its free cells, pulled straight wherever the
 * line between two of its points crosses nothing blocked. */
export const roomPath = (grid: FloorGrid, node: Cell, from: RoomEnd, to: RoomEnd): WalkPoint[] => {
  const room = prefabRoomAt(grid, node[0], node[1])
  if (!room) return []
  const doors = roomDoors(grid, node[0], node[1])
  const endCell = (end: RoomEnd): Cell => (end === "stop" ? room.stop : (doors[end.door] ?? node))
  const a = endCell(from)
  const b = endCell(to)
  const inRoom = (cell: Cell): WalkPoint => ({ ...centreOf(cell), inRoom: true })
  if (a[0] === b[0] && a[1] === b[1]) return [inRoom(a)]

  const free = freeCells(grid, node, room)
  const { top, left, rows, cols } = room.rect
  const boxes: Box[] = []
  for (let r = top; r < top + rows; r++)
    for (let c = left; c < left + cols; c++) if (!free.has(`${r},${c}`)) boxes.push(boxOf([r, c]))
  const sees = (p: WalkPoint, q: WalkPoint) => !boxes.some(box => crosses(p, q, box))

  // Pulled straight: the shortest chain of the run's points whose every leg crosses nothing blocked.
  const run = cellRun(free, a, b).map(inRoom)
  const best = run.map((_, j) => (j === 0 ? 0 : Infinity))
  const prev = run.map(() => -1)
  for (let j = 1; j < run.length; j++)
    for (let i = 0; i < j; i++) {
      if (i < j - 1 && !sees(run[i], run[j])) continue
      const d = best[i] + Math.hypot(run[j].x - run[i].x, run[j].y - run[i].y)
      if (d < best[j] - 1e-9) {
        best[j] = d
        prev[j] = i
      }
    }
  const path: WalkPoint[] = []
  for (let at = run.length - 1; at >= 0; at = prev[at]) path.unshift(run[at])
  return path
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

/** The pixel points the explorer walks for a route: cell centres, the first and last at their standing spots, each stretch
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
