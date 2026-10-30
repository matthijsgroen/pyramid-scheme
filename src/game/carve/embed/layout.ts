import { mulberry32 } from "../../random"
import type { Direction } from "../../siteTypes"
import { OPPOSITE } from "../grid"
import type { Cell } from "../state"
import {
  cellOfKey,
  dirBetween,
  keyOf,
  step,
  through,
  type CellKey,
  type FloorGraph,
  type FloorString,
  type Piece,
} from "./graph"

/** How far a string's draw reaches past its nodes' need at full spread. */
export const GAP_RANGE = 6
/** How often the push may make room, per element and in all, before the floor counts as one it cannot lay out. The
 * shipped floors take at most 37 rounds over 148 elements. */
const PUSH_PER_ELEMENT = 4
const PUSH_BASE = 64
/** How often the press may raise a group, per held cell, before it counts as one that finds no rest. The shipped
 * floors take at most 1.5. */
const RAISES_PER_CELL = 8
/** The cells a string keeps between two of its stops, or between a stop and a door place. */
const STOP_GAP = 1

/** How often the press works both axes at most. */
const PRESS_ROUNDS = 8

const LAYOUT_SALT = 0x5bd1e995

/** A string as laid: its corner cells from its `a` end's door place to its `b` end's, and where each of its nodes
 * stands, in order. */
export type LaidString = { corners: Cell[]; stops: Cell[] }

/** Where each piece's top-left stands and how each string runs; `slack` counts the strings the press left longer than
 * their stops need, before any spread, and `pushes` the rounds the push took. */
export type Layout = {
  graph: FloorGraph
  blocks: Map<CellKey, Cell>
  strings: LaidString[]
  pushes: number
  slack: number
}

/** A piece's cells as offsets from its top-left, and where its top-left stands on the sketch. */
export const footprint = (piece: Piece): { used: Cell[]; origin: Cell } => {
  const [r, c] = cellOfKey(piece.key)
  if (piece.kind === "node") return { used: [[0, 0]], origin: [r, c] }
  if (piece.kind === "room") return { used: block(3, 3), origin: [r - 1, c - 1] }
  const { rows, cols, node } = piece.room
  return { used: block(rows, cols), origin: [r - node[0], c - node[1]] }
}
const block = (rows: number, cols: number): Cell[] =>
  Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c): Cell => [r, c])).flat()

const nodeOffset = (piece: Piece): Cell =>
  piece.kind === "node" ? [0, 0] : piece.kind === "room" ? [1, 1] : piece.room.node

/** The cells a way out crosses inside its piece, from after the node out to its door place, as offsets from the
 * piece's top-left: none where the node is its own door place, or undefined where the piece has no way out there. */
export const doorRay = (piece: Piece, side: Direction): Cell[] | undefined => {
  const at = nodeOffset(piece)
  if (piece.kind === "node") return []
  if (piece.kind === "room") return [step(at, side)]
  const door = piece.room.doors[side]
  if (!door) return undefined
  const length = Math.abs(door[0] - at[0]) + Math.abs(door[1] - at[1])
  if (keyOf(step(at, side, length)) !== keyOf(door)) return undefined
  return Array.from({ length }, (_, k) => step(at, side, k + 1))
}

/** The cells a string needs between its door places: each stop and a gap before each and after the last; a drop its
 * launch, run and landing, less what its ends' rings hold. */
export const needOf = (s: FloorString, rayA: number, rayB: number): number =>
  s.drop ? s.drop.run.length + 2 - rayA - rayB : s.nodes.length + (s.nodes.length + 1) * STOP_GAP
/** How far apart two stops' nodes stand at least, whose door places reach `exA` and `exB` cells out. */
const stopDistance = (exA: number, exB: number) => exA + exB + STOP_GAP + 1

const cornersOf = (doorA: Cell, cells: readonly Cell[], doorB: Cell): Cell[] => {
  const all = [doorA, ...cells, doorB]
  return all.filter(
    (cell, i) => i === 0 || i === all.length - 1 || dirBetween(all[i - 1], cell) !== dirBetween(cell, all[i + 1])
  )
}

/** One straight run between two sketch nodes: `u` the low end on `axis` (0 rows, 1 columns), the doors' reach into
 * each end, and the distance between the ends' nodes it keeps at least. */
type Edge = { u: number; v: number; axis: 0 | 1; extU: number; extV: number; min: number; si: number }

/** Where an owner number names a run rather than an element: a run's owner is `E` plus its index. */
const E = 1 << 20

/** A drawing of the floor in cells: who holds each cell (an element's index, an edge's index after the elements, or
 * -1), the drawing's top-left on the floor, and the first cell two holders claim. */
type Raster = { top: number; left: number; rows: number; cols: number; grid: Int32Array; overlap?: [number, number] }

/**
 * THE FLOOR'S GRAPH GIVEN POSITIONS. Every sketch node starts where the sketch draws it. A string holds only its
 * stops; a plain corridor node melts into it, standing as a bend where the sketch turns there. Every run between two
 * points of a string is straight, and a piece with more than two ways keeps the side each leaves by, so the order of
 * its ways and every loop stays, and the floor stays planar.
 * - Push: two holders that overlap part on the straight line that needs the least room, everything beyond it moving
 *   on. A run shorter than its stops need (two cells per stop plus one between door places, a drop its launch, run and
 *   landing), or two holders that touch without joining (a 1-cell margin between all that does not join), get one
 *   cell at a time on the seam that parts them and moves the fewest held cells: only what lies beyond it moves, and a
 *   line with nothing beyond it stays as it is.
 * - Press: on each axis in turn, every group of holders a run across the axis ties together moves as far toward the
 *   low side as it may (`pressAxis`), then toward the high side as far as its runs pull it, until nothing moves.
 * - Re-route: a string longer than its stops need is laid afresh on the shortest free way between its ends that holds
 *   them, its bends wherever that way turns, its leaf end moving with it (`reroute`), where the floor grows no larger;
 *   then the floor is pressed again.
 * - Spread: each string but a drop gets `round(spread * GAP_RANGE * u)` cells more, u in [0.5, 1.5), pushed in on
 *   one of its runs.
 * A floor is refused only where two holders can be parted on neither axis.
 */
export const layoutFloor = (
  graph: FloorGraph,
  opts: { seed: number; spread: number }
): Layout | { refused: string } => {
  const { strings } = graph
  const keys: CellKey[] = [...graph.pieces.keys()]
  for (const s of strings) keys.push(...s.nodes)
  const index = new Map(keys.map((key, i) => [key, i]))
  /** The sketch's nodes come first; a bend a re-route lays stands after them. */
  const sketchNodes = keys.length
  const pos: Cell[] = keys.map(cellOfKey)
  const shapes: Cell[][] = keys.map(key => {
    const piece = graph.pieces.get(key)
    if (!piece) return [[0, 0]]
    const off = nodeOffset(piece)
    return footprint(piece).used.map(([r, c]): Cell => [r - off[0], c - off[1]])
  })
  const ext = (i: number, dir: Direction): number | undefined => {
    const piece = i < sketchNodes ? graph.pieces.get(keys[i]) : undefined
    return piece ? doorRay(piece, dir)?.length : 0
  }

  const door = (i: number, dir: Direction) => step(pos[i], dir, ext(i, dir)!)

  // Each string as the elements it runs through from its `a` end to its `b` end, and the sides it leaves its ends by.
  // A plain corridor node where the sketch turns becomes a bend; one the string runs straight through is gone.
  const chains: number[][] = strings.map((s, si) => {
    if (s.drop) return [index.get(s.a)!, index.get(s.b)!]
    const points = s.path.flatMap((cell, i) => {
      if (i % 2 === 0) return []
      const stop = s.stopAt.indexOf(i)
      if (stop >= 0) return [index.get(s.nodes[stop])!]
      if (dirBetween(s.path[i - 1], cell) === dirBetween(cell, s.path[i + 1])) return []
      keys.push(`bend ${si} ${keys.length}`)
      pos.push([...cell])
      shapes.push([[0, 0]])
      return [keys.length - 1]
    })
    return [index.get(s.a)!, ...points, index.get(s.b)!]
  })
  const sides: [Direction, Direction][] = strings.map(s => [s.dirA, s.dirB])
  /** A string's runs. Between two of its stops (its ends and its nodes) its runs keep the cells the stops need: one
   * between door places at least, two per run where a bend splits it. */
  const runsOf = (si: number): Edge[] | string => {
    const s = strings[si]
    const chain = chains[si]
    const runs: Edge[] = []
    const add = (x: number, y: number, dir: Direction, ex: number, ey: number, min: number) => {
      const low = dir === "s" || dir === "e"
      runs.push({
        u: low ? x : y,
        v: low ? y : x,
        axis: dir === "n" || dir === "s" ? 0 : 1,
        extU: low ? ex : ey,
        extV: low ? ey : ex,
        min,
        si,
      })
    }
    const [sideA, sideB] = sides[si]
    const [extA, extB] = [ext(chain[0], sideA), ext(chain[chain.length - 1], sideB)]
    if (extA === undefined || extB === undefined) return keys[extA === undefined ? chain[0] : chain[chain.length - 1]]
    if (s.drop) {
      add(
        chain[0],
        chain[1],
        sideA,
        extA,
        extB,
        Math.max(needOf(s, extA, extB) + extA + extB + 1, stopDistance(extA, extB))
      )
      return runs
    }
    const anchors = chain.flatMap((i, j) => (i < sketchNodes ? [j] : []))
    for (let k = 0; k + 1 < anchors.length; k++) {
      const [from, to] = [anchors[k], anchors[k + 1]]
      const [exFrom, exTo] = [from === 0 ? extA : 0, to === chain.length - 1 ? extB : 0]
      const mins = Array.from(
        { length: to - from },
        (_, j) => 1 + (j === 0 ? exFrom : 0) + (j === to - from - 1 ? exTo : 0)
      )
      mins[0] += Math.max(0, stopDistance(exFrom, exTo) - mins.reduce((sum, m) => sum + m, 0))
      for (let j = from; j < to; j++) {
        const dir =
          j === 0 ? sideA : j === chain.length - 2 ? OPPOSITE[sideB] : dirBetween(pos[chain[j]], pos[chain[j + 1]])
        add(chain[j], chain[j + 1], dir, j === 0 ? extA : 0, j === chain.length - 2 ? extB : 0, mins[j - from])
      }
    }
    return runs
  }
  let edges: Edge[] = []
  const rebuild = (): string | undefined => {
    const all: Edge[] = []
    for (let si = 0; si < strings.length; si++) {
      const runs = runsOf(si)
      if (typeof runs === "string") return runs
      all.push(...runs)
    }
    edges = all
    adjacent.clear()
    for (const e of edges) adjacent.add(`${e.u},${e.v}`).add(`${e.v},${e.u}`)
    return undefined
  }
  const adjacent = new Set<string>()
  const missing = rebuild()
  if (missing) return { refused: `no room for the piece at ${missing}` }
  const lengthOf = (e: Edge) => pos[e.v][e.axis] - pos[e.u][e.axis]
  const edgeCells = (e: Edge): Cell[] => {
    const cells: Cell[] = []
    const across = pos[e.u][1 - e.axis]
    for (let k = pos[e.u][e.axis] + e.extU + 1; k < pos[e.v][e.axis] - e.extV; k++)
      cells.push(e.axis === 1 ? [across, k] : [k, across])
    return cells
  }
  const cellsOf = (owner: number): Cell[] =>
    owner < E
      ? shapes[owner].map(([r, c]): Cell => [pos[owner][0] + r, pos[owner][1] + c])
      : edgeCells(edges[owner - E])
  const anchors = (owner: number): Cell[] =>
    owner < E ? [pos[owner]] : [pos[edges[owner - E].u], pos[edges[owner - E].v]]
  const joined = (x: number, y: number) => {
    if (x < E && y < E) return adjacent.has(`${x},${y}`)
    if (x >= E && y >= E) return false
    const e = edges[(x >= E ? x : y) - E]
    const end = x >= E ? y : x
    return e.u === end || e.v === end
  }
  const keyOfOwner = (owner: number) => keys[owner < E ? owner : edges[owner - E].u]

  const raster = (): Raster => {
    const all: [number, Cell[]][] = []
    for (let i = 0; i < keys.length; i++) all.push([i, cellsOf(i)])
    edges.forEach((_, j) => all.push([E + j, cellsOf(E + j)]))
    let [top, left, bottom, right] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const [, cells] of all)
      for (const [r, c] of cells) {
        top = Math.min(top, r)
        bottom = Math.max(bottom, r)
        left = Math.min(left, c)
        right = Math.max(right, c)
      }
    top--
    left--
    const rows = bottom - top + 2
    const cols = right - left + 2
    const grid = new Int32Array(rows * cols).fill(-1)
    let overlap: [number, number] | undefined
    for (const [owner, cells] of all)
      for (const [r, c] of cells) {
        const at = (r - top) * cols + (c - left)
        if (grid[at] >= 0 && grid[at] !== owner) overlap ??= [grid[at], owner]
        grid[at] = owner
      }
    return { top, left, rows, cols, grid, ...(overlap ? { overlap } : {}) }
  }
  const touching = ({ rows, cols, grid }: Raster): [number, number] | undefined => {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const here = grid[r * cols + c]
        if (here < 0) continue
        for (const there of [c + 1 < cols ? grid[r * cols + c + 1] : -1, r + 1 < rows ? grid[(r + 1) * cols + c] : -1])
          if (there >= 0 && there !== here && !joined(here, there)) return [here, there]
      }
    return undefined
  }
  const insert = (axis: 0 | 1, boundary: number, k: number) => {
    for (const at of pos) if (at[axis] >= boundary) at[axis] += k
  }

  /** The straight line that parts two holders with the least room, and the room it needs. */
  const parting = (x: number, y: number) => {
    let best: { axis: 0 | 1; boundary: number; k: number } | undefined
    for (const axis of [1, 0] as const) {
      const ax = anchors(x).map(at => at[axis])
      const ay = anchors(y).map(at => at[axis])
      const [low, high] =
        Math.max(...ax) < Math.min(...ay) ? [x, y] : Math.max(...ay) < Math.min(...ax) ? [y, x] : [undefined, undefined]
      if (low === undefined || high === undefined) continue
      const boundary = Math.max(...anchors(low).map(at => at[axis])) + 1
      let k = 0
      const highCells = cellsOf(high)
      for (const l of cellsOf(low))
        for (const h of highCells) {
          const off = Math.abs(l[1 - axis] - h[1 - axis])
          if (off <= 1) k = Math.max(k, (off === 0 ? 2 : 1) - (h[axis] - l[axis]))
        }
      if (k > 0 && (!best || k < best.k)) best = { axis, boundary, k }
    }
    return best
  }

  /** The seam across `axis` that parts `low` from `high` (all of `low` before it on every line, all of `high` at or
   * after it), splits no piece, keeps every joined pair in line and brings nothing new side by side when one cell goes
   * in along it; of those, the one that moves the fewest held cells. */
  const insertionSeam = (drawn: Raster, low: number, high: number, axis: 0 | 1) => {
    const { top, left, rows, cols, grid } = drawn
    const [L, P] = axis === 1 ? [rows, cols] : [cols, rows]
    const [lineOrigin, posOrigin] = axis === 1 ? [top, left] : [left, top]
    const at = (l: number, p: number) => (p < 0 || p >= P ? -1 : axis === 1 ? grid[l * cols + p] : grid[p * cols + l])
    const after = Array.from({ length: L }, () => -1)
    const before = Array.from({ length: L }, () => P)
    for (const [r, c] of [...cellsOf(low), ...anchors(low)]) {
      const [l, p] = axis === 1 ? [r - top, c - left] : [c - left, r - top]
      after[l] = Math.max(after[l], p)
    }
    for (const [r, c] of [...cellsOf(high), ...anchors(high)]) {
      const [l, p] = axis === 1 ? [r - top, c - left] : [c - left, r - top]
      before[l] = Math.min(before[l], p)
    }
    const allowed = (l: number, p: number) => {
      if (p <= after[l] || p > before[l]) return false
      const [x, y] = [at(l, p - 1), at(l, p)]
      return !(x >= 0 && x === y && x < E)
    }
    const moved = Array.from({ length: L }, (_, l) => {
      const counts = new Int32Array(P + 1)
      for (let p = P - 1; p >= 0; p--) counts[p] = counts[p + 1] + (at(l, p) >= 0 ? 1 : 0)
      return counts
    })
    const linked = (l: number, c: number) => {
      const [x, y] = [at(l, c), at(l + 1, c)]
      return x >= 0 && y >= 0 && (x === y || joined(x, y))
    }
    const both = (l: number, c: number, m: number, d: number) => at(l, c) >= 0 && at(m, d) >= 0
    const W = P + 1
    const cost = new Float64Array(L * W).fill(Infinity)
    const from = new Int32Array(L * W).fill(-1)
    for (let p = 0; p <= P; p++) if (allowed(0, p)) cost[p] = moved[0][p]
    for (let l = 0; l + 1 < L; l++) {
      const here = (p: number) => cost[l * W + p]
      const offer = (p: number, s: number) => {
        if (s < 0 || !allowed(l + 1, p)) return
        const total = here(s) + moved[l + 1][p]
        if (total < cost[(l + 1) * W + p]) {
          cost[(l + 1) * W + p] = total
          from[(l + 1) * W + p] = s
        }
      }
      const better = (a: number, b: number) => (a < 0 ? b : b < 0 ? a : here(b) < here(a) ? b : a)
      let best = -1
      for (let k = 0; k <= P; k++) {
        const own = here(k) < Infinity ? k : -1
        offer(k, better(best, own))
        best = linked(l, k) ? -1 : better(both(l, k - 1, l + 1, k) ? -1 : best, own)
      }
      best = -1
      for (let k = P; k >= 0; k--) {
        const own = here(k) < Infinity ? k : -1
        offer(k, better(best, own))
        best = linked(l, k - 1) ? -1 : better(both(l, k, l + 1, k - 1) ? -1 : best, own)
      }
    }
    let end = -1
    for (let p = 0; p <= P; p++) if (cost[(L - 1) * W + p] < (end < 0 ? Infinity : cost[(L - 1) * W + end])) end = p
    if (end < 0) return undefined
    const total = cost[(L - 1) * W + end]
    const seam = new Int32Array(L)
    for (let l = L - 1; l >= 0; l--) {
      seam[l] = end
      if (l > 0) end = from[l * W + end]
    }
    return {
      total,
      apply: () => {
        for (const cell of pos) if (cell[axis] - posOrigin >= seam[cell[1 - axis] - lineOrigin]) cell[axis]++
      },
    }
  }
  /** One cell of room between two holders, on the seam that moves the least; false where no seam parts them. */
  const pushApart = (drawn: Raster, x: number, y: number, axes: readonly (0 | 1)[]) => {
    let best: ReturnType<typeof insertionSeam>
    for (const axis of axes)
      for (const [low, high] of [
        [x, y],
        [y, x],
      ]) {
        const seam = insertionSeam(drawn, low, high, axis)
        if (seam && (!best || seam.total < best.total)) best = seam
      }
    if (!best) return false
    best.apply()
    return true
  }

  let pushes = 0
  for (; ; pushes++) {
    if (pushes > PUSH_BASE + PUSH_PER_ELEMENT * keys.length)
      return { refused: `the push finds no room for the floor at ${graph.entrance}` }
    const drawn = raster()
    if (drawn.overlap) {
      const line = parting(...drawn.overlap)
      if (!line) return { refused: `no room for the piece at ${keyOfOwner(drawn.overlap[0])}` }
      insert(line.axis, line.boundary, line.k)
      continue
    }
    const short = edges.find(e => lengthOf(e) < e.min)
    if (short) {
      if (!pushApart(drawn, short.u, short.v, [short.axis]))
        insert(short.axis, pos[short.u][short.axis] + 1, short.min - lengthOf(short))
      continue
    }
    const clash = touching(drawn)
    if (!clash) break
    if (pushApart(drawn, clash[0], clash[1], [1, 0])) continue
    const line = parting(...clash)
    if (!line) return { refused: `no room for the piece at ${keyOfOwner(clash[0])}` }
    insert(line.axis, line.boundary, line.k)
  }

  /**
   * Moves every group of holders that a run across `axis` ties together as far toward the low side as it may go (the
   * least solution of the floor's constraints, by longest paths), and says whether any moved. A run along `axis`
   * keeps its need; on each line, and between neighbouring lines, holders keep their order with a cell between them
   * on a line and none needed between lines. Holders two lines apart may pass each other: that is how a bend moves.
   */
  const pressAxis = (axis: 0 | 1): boolean | "restless" => {
    const across = (1 - axis) as 0 | 1
    const group = keys.map((_, i) => i)
    const find = (i: number): number => (group[i] === i ? i : (group[i] = find(group[i])))
    for (const e of edges) if (e.axis !== axis) group[find(e.u)] = find(e.v)
    const roots = keys.map((_, i) => find(i))
    // An item: a held cell on a line at a place, held by `owner` and moving with group `g` at `off` from it.
    type Item = { line: number; p: number; g: number; off: number; owner: number }
    const items: Item[] = []
    for (let i = 0; i < keys.length; i++) {
      const g = roots[i]
      for (const [r, c] of cellsOf(i)) {
        const cell: Cell = [r, c]
        items.push({ line: cell[across], p: cell[axis], g, off: cell[axis] - pos[g][axis], owner: i })
      }
    }
    edges.forEach((e, j) => {
      const cells = edgeCells(e)
      if (e.axis !== axis) {
        const g = roots[e.u]
        for (const cell of cells)
          items.push({ line: cell[across], p: cell[axis], g, off: cell[axis] - pos[g][axis], owner: E + j })
        return
      }
      if (!cells.length) return
      const [first, last] = [cells[0], cells[cells.length - 1]]
      const [gu, gv] = [roots[e.u], roots[e.v]]
      items.push({ line: first[across], p: first[axis], g: gu, off: first[axis] - pos[gu][axis], owner: E + j })
      items.push({ line: last[across], p: last[axis], g: gv, off: last[axis] - pos[gv][axis], owner: E + j })
    })
    const lines = new Map<number, Item[]>()
    for (const item of items) (lines.get(item.line) ?? lines.set(item.line, []).get(item.line)!).push(item)
    for (const list of lines.values()) list.sort((a, b) => a.p - b.p)

    // Constraints: x[to] >= x[from] + w.
    const out = new Map<number, [number, number][]>()
    const need = (a: Item, b: Item, gap: number) => {
      if (a.g === b.g) return
      ;(out.get(a.g) ?? out.set(a.g, []).get(a.g)!).push([b.g, gap + a.off - b.off])
    }
    for (const e of edges)
      if (e.axis === axis) need({ g: roots[e.u], off: 0 } as Item, { g: roots[e.v], off: 0 } as Item, e.min)
    for (const [line, list] of lines) {
      for (let k = 0; k + 1 < list.length; k++)
        if (list[k].owner !== list[k + 1].owner)
          need(list[k], list[k + 1], joined(list[k].owner, list[k + 1].owner) ? 1 : 2)
      const next = lines.get(line + 1)
      if (!next) continue
      const nearestAfter = (from: Item[], to: Item[]) => {
        let j = 0
        for (const a of from) {
          while (j < to.length && to[j].p <= a.p) j++
          if (j < to.length) need(a, to[j], 1)
        }
      }
      nearestAfter(list, next)
      nearestAfter(next, list)
    }

    const groups = [...new Set(roots)]
    const x = new Map<number, number>()
    for (const g of groups) x.set(g, 0)
    for (const item of items) x.set(item.g, Math.max(x.get(item.g)!, -item.off))
    const queue = [...groups]
    const queued = new Set(groups)
    let relaxations = 0
    while (queue.length) {
      const g = queue.shift()!
      queued.delete(g)
      for (const [h, w] of out.get(g) ?? [])
        if (x.get(g)! + w > x.get(h)!) {
          x.set(h, x.get(g)! + w)
          if (++relaxations > RAISES_PER_CELL * items.length) return "restless"
          if (!queued.has(h)) {
            queued.add(h)
            queue.push(h)
          }
        }
    }
    // Then each group its runs pull toward the high side moves there as far as its constraints and the floor's
    // extent allow, so a run ends no longer than the pressed floor makes it.
    const into = new Map<number, [number, number][]>()
    for (const [g, list] of out) for (const [h, w] of list) (into.get(h) ?? into.set(h, []).get(h)!).push([g, w])
    const pull = new Map<number, number>()
    for (const e of edges)
      if (e.axis === axis && roots[e.u] !== roots[e.v]) {
        pull.set(roots[e.u], (pull.get(roots[e.u]) ?? 0) + 1)
        pull.set(roots[e.v], (pull.get(roots[e.v]) ?? 0) - 1)
      }
    const reach = new Map<number, [number, number]>()
    for (const item of items) {
      const [lo, hi] = reach.get(item.g) ?? [Infinity, -Infinity]
      reach.set(item.g, [Math.min(lo, item.off), Math.max(hi, item.off)])
    }
    const extent = Math.max(...items.map(item => x.get(item.g)! + item.off))
    for (let round = 0, changed = true; changed && round < PRESS_ROUNDS * 10; round++) {
      changed = false
      for (const g of groups) {
        // A group its runs pull both ways equally goes high too, so that one pulled high behind it can follow.
        if (!reach.has(g) || !pull.has(g)) continue
        const toward = pull.get(g)! >= 0 ? 1 : -1
        let target = toward > 0 ? extent - reach.get(g)![1] : -reach.get(g)![0]
        if (toward > 0) for (const [h, w] of out.get(g) ?? []) target = Math.min(target, x.get(h)! - w)
        else for (const [h, w] of into.get(g) ?? []) target = Math.max(target, x.get(h)! + w)
        if (toward > 0 ? target > x.get(g)! : target < x.get(g)!) {
          x.set(g, target)
          changed = true
        }
      }
    }
    const shift = new Map(groups.map(g => [g, x.get(g)! - pos[g][axis]]))
    for (let i = 0; i < keys.length; i++) pos[i][axis] += shift.get(roots[i])!
    return new Set(items.map(item => shift.get(item.g))).size > 1
  }
  /** Presses both axes until nothing moves; false where a group finds no rest. */
  const press = (): boolean => {
    for (let round = 0, moved = true; moved && round < PRESS_ROUNDS; round++) {
      moved = false
      for (const axis of [1, 0] as const) {
        const result = pressAxis(axis)
        if (result === "restless") return false
        if (result) moved = true
      }
    }
    return true
  }
  const restless = { refused: `the press finds no rest for the floor at ${graph.entrance}` }
  if (!press()) return restless

  // The sides each end's strings leave it by: a piece with more than two ways keeps the sketch's, so the order of
  // its ways around it stays.
  const ways = new Map<number, number>()
  for (const chain of chains)
    for (const end of [chain[0], chain[chain.length - 1]]) ways.set(end, (ways.get(end) ?? 0) + 1)
  const lengthBetweenDoors = (si: number) => {
    const chain = chains[si]
    let total = 0
    for (let j = 0; j + 1 < chain.length; j++)
      total += Math.abs(pos[chain[j]][0] - pos[chain[j + 1]][0]) + Math.abs(pos[chain[j]][1] - pos[chain[j + 1]][1])
    return total - ext(chain[0], sides[si][0])! - ext(chain[chain.length - 1], sides[si][1])! - 1
  }
  /**
   * Lays a string afresh on the shortest way through free ground between its ends that still holds its stops, where
   * that is shorter than its way now: free ground holds nothing and touches nothing but the door it leaves or reaches.
   * An end with two ways or fewer may be left by any side its other way does not take; the string's bends then stand
   * wherever the new way turns.
   */
  const reroute = (si: number): boolean => {
    const s = strings[si]
    if (s.drop) return false
    const chain = chains[si]
    const [a, b] = [chain[0], chain[chain.length - 1]]
    const need = needOf(s, 0, 0)
    const now = lengthBetweenDoors(si)
    if (now <= need) return false
    const leaf = (end: number) => ways.get(end) === 1
    // The way is looked for from a fixed end; a far end that is a leaf moves to wherever the way can end first.
    const fromB = leaf(a) && !leaf(b)
    const [start, startSelf, far, farSelf] = fromB ? ([b, 1, a, 0] as const) : ([a, 0, b, 1] as const)
    const moves = leaf(far)
    const used = (end: number, self: 0 | 1) =>
      new Set(
        chains.flatMap((other, oi) => [
          ...(other[0] === end && !(oi === si && self === 0) ? [sides[oi][0]] : []),
          ...(other[other.length - 1] === end && !(oi === si && self === 1) ? [sides[oi][1]] : []),
        ])
      )
    const sidesOf = (end: number, self: 0 | 1): Direction[] =>
      (ways.get(end) ?? 0) > 2
        ? [sides[si][self]]
        : (["n", "e", "s", "w"] as Direction[]).filter(dir => ext(end, dir) !== undefined && !used(end, self).has(dir))
    const own = new Set<number>(chain.slice(1, -1))
    if (moves) own.add(far)
    edges.forEach((e, j) => e.si === si && own.add(E + j))
    const { top, left, rows, cols, grid } = raster()
    const PAD = 2 + Math.max(...shapes[far].map(([r, c]) => Math.max(Math.abs(r), Math.abs(c))))
    const held = ([r, c]: Cell) => {
      const [gr, gc] = [r - top, c - left]
      if (gr < 0 || gc < 0 || gr >= rows || gc >= cols) return false
      const owner = grid[gr * cols + gc]
      return owner >= 0 && !own.has(owner)
    }
    const inside = ([r, c]: Cell) => r >= top - PAD && c >= left - PAD && r < top + rows + PAD && c < left + cols + PAD
    const same = (x: Cell, y: Cell) => x[0] === y[0] && x[1] === y[1]
    const free = (cell: Cell, doors: readonly Cell[]) =>
      inside(cell) &&
      !held(cell) &&
      (["n", "e", "s", "w"] as Direction[]).every(
        dir => !held(step(cell, dir)) || doors.some(d => same(d, step(cell, dir)))
      )
    const startDoors = sidesOf(start, startSelf).map(side => ({ side, door: door(start, side) }))
    const fixedGoals = moves ? [] : sidesOf(far, farSelf).map(side => ({ side, door: door(far, side) }))
    const goalAt = new Map(fixedGoals.map(g => [keyOf(step(g.door, g.side)), g]))
    const parent = new Map<string, string | undefined>()
    const arrived = new Map<string, Direction>()
    const turns = new Map<string, number>()
    const pathTo = (cell: Cell) => {
      const way: Cell[] = []
      for (let k: string | undefined = keyOf(cell); k !== undefined; k = parent.get(k)) way.unshift(cellOfKey(k))
      return way
    }
    /** Where the far end stands and the side it is reached by when the way ends at `cell`, if it may. */
    const ending = (cell: Cell): { side: Direction; node: Cell } | undefined => {
      if (!moves) {
        const goal = goalAt.get(keyOf(cell))
        if (!goal || !free(cell, [goal.door, ...startDoors.map(st => st.door)])) return undefined
        return { side: goal.side, node: pos[far] }
      }
      const dir = arrived.get(keyOf(cell))!
      const side = OPPOSITE[dir]
      const reach = ext(far, side)
      if (reach === undefined) return undefined
      const node = step(step(cell, dir), dir, reach)
      const cells = shapes[far].map(([r, c]): Cell => [node[0] + r, node[1] + c])
      const way = pathTo(cell)
      const doorCell = step(cell, dir)
      for (const at of cells) {
        if (!free(at, [])) return undefined
        for (const w of way)
          if (Math.abs(w[0] - at[0]) + Math.abs(w[1] - at[1]) <= 1 && !(same(w, cell) && same(at, doorCell)))
            return undefined
      }
      return { side, node }
    }
    let frontier: Cell[] = []
    for (const { side, door: d } of startDoors) {
      const cell = step(d, side)
      if (parent.has(keyOf(cell)) || !free(cell, [d, ...fixedGoals.map(g => g.door)])) continue
      parent.set(keyOf(cell), undefined)
      arrived.set(keyOf(cell), side)
      turns.set(keyOf(cell), 0)
      frontier.push(cell)
    }
    let found: { cell: Cell; side: Direction; node: Cell } | undefined
    for (let length = 1; frontier.length && length < now && !found; length++) {
      if (length >= need)
        for (const cell of frontier) {
          const end = ending(cell)
          if (end) {
            found = { cell, ...end }
            break
          }
        }
      // Of the ways that reach a cell first, the one that turns least.
      const next = new Map<string, Cell>()
      for (const cell of frontier)
        for (const dir of ["n", "e", "s", "w"] as Direction[]) {
          const to = step(cell, dir)
          const bent = turns.get(keyOf(cell))! + (arrived.get(keyOf(cell)) === dir ? 0 : 1)
          if (parent.has(keyOf(to)) && !(next.has(keyOf(to)) && bent < turns.get(keyOf(to))!)) continue
          const goal = goalAt.get(keyOf(to))
          if (!free(to, goal ? [goal.door] : [])) continue
          parent.set(keyOf(to), keyOf(cell))
          arrived.set(keyOf(to), dir)
          turns.set(keyOf(to), bent)
          next.set(keyOf(to), to)
        }
      frontier = [...next.values()]
    }
    if (!found) return false
    const way = pathTo(found.cell)
    const startSide = arrived.get(keyOf(way[0]))!
    const was = {
      chain: chains[si],
      sides: sides[si],
      at: chain.map(i => [...pos[i]] as Cell),
    }
    pos[far] = [...found.node]
    // The way from `a` to `b`, and the sides it leaves them by.
    const [wayAB, sideA, sideB] = fromB ? [[...way].reverse(), found.side, startSide] : [way, startSide, found.side]
    const [doorA, doorB] = [door(a, sideA), door(b, sideB)]
    const stopAt = new Set(s.nodes.map((_, i) => 2 * i + 1))
    const points: number[] = []
    let stop = 0
    wayAB.forEach((cell, i) => {
      const before = i === 0 ? doorA : wayAB[i - 1]
      const after = i === wayAB.length - 1 ? doorB : wayAB[i + 1]
      if (stopAt.has(i)) {
        const node = index.get(s.nodes[stop++])!
        pos[node] = [...cell]
        points.push(node)
      } else if (dirBetween(before, cell) !== dirBetween(cell, after)) {
        keys.push(`bend ${si} ${keys.length}`)
        pos.push([...cell])
        shapes.push([[0, 0]])
        points.push(keys.length - 1)
      }
    })
    for (const i of chain.slice(1, -1)) if (i >= sketchNodes) shapes[i] = []
    chains[si] = [a, ...points, b]
    sides[si] = [sideA, sideB]
    rebuild()
    const drawn = raster()
    if (
      !drawn.overlap &&
      !touching(drawn) &&
      edges.every(e => lengthOf(e) >= e.min) &&
      drawn.rows * drawn.cols <= rows * cols
    )
      return true
    for (const i of points) if (i >= sketchNodes) shapes[i] = []
    chains[si] = was.chain
    sides[si] = was.sides
    was.chain.forEach((i, k) => {
      pos[i] = was.at[k]
      if (i >= sketchNodes) shapes[i] = [[0, 0]]
    })
    rebuild()
    return false
  }
  for (let round = 0; round < PRESS_ROUNDS; round++) {
    let laid = false
    for (let si = 0; si < strings.length; si++) if (reroute(si)) laid = true
    if (!laid) break
    if (!press()) return restless
  }

  const slack = strings.filter((_, si) => edges.some(e => e.si === si && lengthOf(e) > e.min)).length

  if (opts.spread > 0) {
    const rand = mulberry32(opts.seed ^ LAYOUT_SALT)
    strings.forEach((s, si) => {
      const extra = Math.round(opts.spread * GAP_RANGE * (0.5 + rand()))
      const own = edges.filter(e => e.si === si)
      const e = own[Math.floor(rand() * own.length)]
      if (s.drop) return
      for (let k = 0; k < extra; k++)
        if (!pushApart(raster(), e.u, e.v, [e.axis])) insert(e.axis, pos[e.u][e.axis] + 1, 1)
    })
  }

  const posOf = (key: CellKey) => pos[index.get(key)!]
  const blocks = new Map<CellKey, Cell>()
  for (const [key, piece] of graph.pieces) {
    const off = nodeOffset(piece)
    blocks.set(key, [posOf(key)[0] - off[0], posOf(key)[1] - off[1]])
  }
  return {
    graph,
    blocks,
    strings: strings.map((s, si) => {
      const chain = chains[si]
      const [doorA, doorB] = [door(chain[0], sides[si][0]), door(chain[chain.length - 1], sides[si][1])]
      const points = chain.slice(1, -1).map(i => [...pos[i]] as Cell)
      const stops = s.nodes.map(node => [...posOf(node)] as Cell)
      return { corners: cornersOf(doorA, through([doorA, ...points, doorB]), doorB), stops }
    }),
    slack,
    pushes,
  }
}
