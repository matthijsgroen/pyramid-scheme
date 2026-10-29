import { hashString } from "../../support/hashString"
import { cellAt, claimsFloorAt } from "../roomFootprint"
import { inRect, STEP } from "../roomShape"
import {
  isCentreKind,
  type CellRect,
  type DecorationKind,
  type Direction,
  type FloorGrid,
  type GridCell,
  type PropFootprint,
  type RoomCell,
} from "../siteTypes"
import { absorbable, meets, ringed } from "./placePrefabs"

type FootprintOf = (kind: DecorationKind) => PropFootprint

/** How many arm cells the room takes as floor at `rect`, or `undefined` where the rect holds anything else. */
const absorbedAt = (grid: FloorGrid, r: number, c: number, dirs: ReadonlySet<Direction>, rect: CellRect) => {
  const arm = new Set<string>()
  for (const dir of dirs) {
    const [dr, dc] = STEP[dir]
    for (let rr = r + dr, cc = c + dc; inRect(rect, rr, cc); rr += dr, cc += dc) {
      if (!absorbable(cellAt(grid, rr, cc), dir)) return undefined
      arm.add(`${rr},${cc}`)
    }
  }
  for (let rr = rect.top; rr < rect.top + rect.rows; rr++)
    for (let cc = rect.left; cc < rect.left + rect.cols; cc++) {
      if ((rr === r && cc === c) || arm.has(`${rr},${cc}`)) continue
      if (cellAt(grid, rr, cc).type !== "empty") return undefined
    }
  return arm.size
}

type Candidate = { rect: CellRect; absorbed: number; offset: number; tie: number }
/** Fewest arm cells taken, then the node nearest the rect's middle, then the hash. */
const preferred = (a: Candidate, b: Candidate): boolean =>
  (a.absorbed - b.absorbed || a.offset - b.offset || a.tie - b.tie) < 0

/** A fork or pass-through chamber dressed with a centre kind and standing no mechanism: a room that may grow. */
export const growsAt = (cell: GridCell, footprintOf: FootprintOf): cell is RoomCell & { decoration: DecorationKind } =>
  cell.type === "room" &&
  (cell.roomType === "fork" || cell.roomType === "chamber") &&
  cell.mechanism === undefined &&
  cell.decoration !== undefined &&
  isCentreKind(cell.decoration, footprintOf)

/**
 * A fork or pass-through chamber dressed with a centre kind, and standing no mechanism, takes the rect its piece needs
 * plus a ring to walk round it, where the floor has one: void, and its own straight arms, which run on to the rect's
 * edge. The rect, ringed
 * once more, keeps clear of every other chamber's 3×3 and of every rect grown before it. No cell's type or dirs
 * changes; a room with no such rect stays as it is, with its `decorationFallback`.
 */
export const growRooms = (grid: FloorGrid, siteId: string, footprintOf: FootprintOf): FloorGrid => {
  const growing: Array<{ r: number; c: number; pk: string }> = []
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (growsAt(cell, footprintOf)) growing.push({ r, c, pk: `${r},${c}` })
    })
  )
  if (growing.length === 0) return grid
  const chambers: CellRect[] = []
  grid.cells.forEach((row, r) =>
    row.forEach((_, c) => {
      if (claimsFloorAt(grid, r, c)) chambers.push({ top: r - 1, left: c - 1, rows: 3, cols: 3 })
    })
  )
  const order = (pk: string) => hashString(`${siteId}|grow|${pk}`)
  growing.sort((a, b) => order(a.pk) - order(b.pk) || (a.pk < b.pk ? -1 : 1))

  const cells = grid.cells.map(row => [...row])
  const grown: CellRect[] = []
  for (const { r, c, pk } of growing) {
    const cell = cells[r][c] as RoomCell & { decoration: DecorationKind }
    const foot = footprintOf(cell.decoration)
    const rows = foot.rows + 2,
      cols = foot.cols + 2
    const others = chambers.filter(({ top, left }) => top !== r - 1 || left !== c - 1)
    let best: Candidate | undefined
    for (let top = Math.max(0, r - rows + 1); top <= r && top + rows <= grid.rows; top++)
      for (let left = Math.max(0, c - cols + 1); left <= c && left + cols <= grid.cols; left++) {
        const rect = { top, left, rows, cols }
        const absorbed = absorbedAt(grid, r, c, cell.dirs, rect)
        if (absorbed === undefined) continue
        const around = ringed(rect)
        if (others.some(other => meets(around, other)) || grown.some(other => meets(around, other))) continue
        const offset = Math.abs(2 * r - (2 * top + rows - 1)) + Math.abs(2 * c - (2 * left + cols - 1))
        const tie = hashString(`${siteId}|grow|${pk}|${top},${left}`)
        const candidate = { rect, absorbed, offset, tie }
        if (!best || preferred(candidate, best)) best = candidate
      }
    if (!best) continue
    const { rect } = best
    grown.push(rect)
    cells[r][c] = {
      ...cell,
      grownRoom: {
        rect,
        piece: { kind: cell.decoration, top: rect.top + 1, left: rect.left + 1, rows: foot.rows, cols: foot.cols },
      },
    }
  }
  return grown.length === 0 ? grid : { ...grid, cells }
}

/** The rooms that may grow (`growsAt`) and found no rect to grow into, keyed `r,c`. */
export const centreFallbacks = (
  grid: FloorGrid,
  footprintOf: FootprintOf
): Array<{ at: string; kind: DecorationKind }> =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      growsAt(cell, footprintOf) && !cell.grownRoom ? [{ at: `${r},${c}`, kind: cell.decoration }] : []
    )
  )
