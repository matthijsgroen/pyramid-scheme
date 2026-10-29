import { cellAt } from "@/game/roomFootprint"
import { STEP, grownCells, roomDoors } from "@/game/roomShape"
import type { CellRect, Direction, FloorGrid } from "@/game/siteTypes"
import { CELL, COL_PITCH, ROW_PITCH, cellCenter } from "./mapScale"
import type { StandingOffset } from "./standingSpot"

export type WalkPoint = { x: number; y: number; inRoom?: true }
export type RoomEnd = { door: Direction } | "stop"

type Cell = readonly [number, number]

const grownOf = (grid: FloorGrid, r: number, c: number) => {
  const cell = cellAt(grid, r, c)
  return cell.type === "room" ? cell.grownRoom : undefined
}

const centreOf = ([r, c]: Cell): WalkPoint => {
  const { cx, cy } = cellCenter(r, c)
  return { x: cx, y: cy }
}

const isDoor = (grid: FloorGrid, node: Cell, at: Cell): boolean =>
  Object.values(roomDoors(grid, node[0], node[1])).some(d => d[0] === at[0] && d[1] === at[1])

/** The ring cell a grown room's node is drawn and met at: south of the piece in the column nearest the node's,
 * skipping door cells, then the other south cells nearest first, then east, west, north. */
export const roomStop = (grid: FloorGrid, r: number, c: number): Cell | undefined => {
  const grown = grownOf(grid, r, c)
  if (!grown) return undefined
  const { rect, piece } = grown
  const { top, left, rows, cols } = piece
  const spans = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i)
  const nearest = (cells: Cell[], by: 0 | 1) =>
    [...cells].sort((a, b) => Math.abs(a[by] - (by ? c : r)) - Math.abs(b[by] - (by ? c : r)) || a[by] - b[by])
  const sides: Cell[][] = [
    nearest(
      spans(left, cols).map((cc): Cell => [top + rows, cc]),
      1
    ),
    nearest(
      spans(top, rows).map((rr): Cell => [rr, left + cols]),
      0
    ),
    nearest(
      spans(top, rows).map((rr): Cell => [rr, left - 1]),
      0
    ),
    nearest(
      spans(left, cols).map((cc): Cell => [top - 1, cc]),
      1
    ),
  ]
  const inside = (at: Cell) => within(rect, at)
  return sides.flat().find(at => inside(at) && !isDoor(grid, [r, c], at)) ?? [r, c]
}

const within = (rect: CellRect, [r, c]: Cell): boolean =>
  r >= rect.top && r < rect.top + rect.rows && c >= rect.left && c < rect.left + rect.cols

type Box = { x0: number; y0: number; x1: number; y1: number }

/** Whether the segment passes through the OPEN interior of the box; grazing its boundary is allowed. */
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
  return t0 < t1
}

const dist = (a: WalkPoint, b: WalkPoint) => Math.hypot(a.x - b.x, a.y - b.y)

/** The shortest polyline between two ends of a grown room that does not cut through its piece. */
export const roomPath = (grid: FloorGrid, node: Cell, from: RoomEnd, to: RoomEnd): WalkPoint[] => {
  const grown = grownOf(grid, node[0], node[1])
  if (!grown) return []
  const { top, left, rows, cols } = grown.piece
  const doors = roomDoors(grid, node[0], node[1])
  const endCell = (end: RoomEnd): Cell =>
    end === "stop" ? (roomStop(grid, node[0], node[1]) ?? node) : (doors[end.door] ?? node)
  const a = endCell(from)
  const b = endCell(to)
  if (a[0] === b[0] && a[1] === b[1]) return [{ ...centreOf(a), inRoom: true }]

  const nw = cellCenter(top, left)
  const se = cellCenter(top + rows - 1, left + cols - 1)
  const box: Box = { x0: nw.cx - CELL / 2, y0: nw.cy - CELL / 2, x1: se.cx + CELL / 2, y1: se.cy + CELL / 2 }
  const points = [
    a,
    b,
    [top + rows, left - 1],
    [top + rows, left + cols],
    [top - 1, left - 1],
    [top - 1, left + cols],
  ].map((cell): WalkPoint => ({ ...centreOf(cell as Cell), inRoom: true }))
  const best = points.map(() => Infinity)
  const prev = points.map(() => -1)
  const done = points.map(() => false)
  best[0] = 0
  for (;;) {
    let u = -1
    points.forEach((_, i) => {
      if (!done[i] && best[i] < Infinity && (u < 0 || best[i] < best[u])) u = i
    })
    if (u < 0 || u === 1) break
    done[u] = true
    points.forEach((p, v) => {
      if (done[v] || crosses(points[u], p, box)) return
      const d = best[u] + dist(points[u], p)
      if (d < best[v] - 1e-9) {
        best[v] = d
        prev[v] = u
      }
    })
  }
  const path: WalkPoint[] = []
  for (let at = 1; at >= 0; at = prev[at]) path.unshift(points[at])
  return path
}

/** The direction of the arm whose straight run inside the room holds this cell. */
const armOf = (grid: FloorGrid, node: Cell, at: Cell): Direction | undefined => {
  const grown = grownOf(grid, node[0], node[1])
  if (!grown) return undefined
  for (const dir of Object.keys(roomDoors(grid, node[0], node[1])) as Direction[]) {
    const [dr, dc] = STEP[dir]
    let cell: Cell = node
    while (within(grown.rect, [cell[0] + dr, cell[1] + dc])) {
      cell = [cell[0] + dr, cell[1] + dc]
      if (cell[0] === at[0] && cell[1] === at[1]) return dir
    }
  }
  return undefined
}

const nodeOf = (grid: FloorGrid, at: Cell): Cell | undefined => {
  const key = grownCells(grid).get(`${at[0]},${at[1]}`)
  return key ? (key.split(",").map(Number) as unknown as Cell) : undefined
}

const endFor = (grid: FloorGrid, node: Cell, at: Cell): RoomEnd => {
  if (at[0] === node[0] && at[1] === node[1]) return "stop"
  const door = armOf(grid, node, at)
  return door ? { door } : "stop"
}

/** The pixel points the explorer walks for a route: cell centres, the first and last at their standing spots, each stretch
 * through a grown room replaced by the shortest way round its piece. A route that starts or ends in a grown room starts or
 * ends at its stop, the spot he stands on in it. */
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
      const from = i === 0 ? "stop" : endFor(grid, node, route[i])
      const to = j === route.length - 1 ? "stop" : endFor(grid, node, route[j])
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

/** Where a cell's marker is drawn: a grown node at its stop, an absorbed arm cell at its door. */
export const markerCell = (grid: FloorGrid, r: number, c: number): Cell => {
  const node = nodeOf(grid, [r, c])
  if (!node) return [r, c]
  if (node[0] === r && node[1] === c) return roomStop(grid, r, c) ?? [r, c]
  const dir = armOf(grid, node, [r, c])
  return (dir && roomDoors(grid, node[0], node[1])[dir]) || [r, c]
}
