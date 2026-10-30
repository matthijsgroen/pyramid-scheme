import { oneWayRuns } from "../../gridNavigation"
import { claimsFloorAt } from "../../roomFootprint"
import type { CorridorCell, Direction, FloorGrid, GridCell } from "../../siteTypes"
import { NODE_STEP, OPPOSITE } from "../grid"
import type { Cell } from "../state"

/** A lattice node, "r,c" on the sketch. */
export type CellKey = string

/** A designed room's footprint, ring included: its size, its node's cell and the door place each way out leaves by,
 * every offset from the footprint's top-left (`seatOf`). */
export type EmbedRoom = { rows: number; cols: number; node: Cell; doors: Partial<Record<Direction, Cell>> }

/**
 * A block of the floor, named by its node:
 * - `node`: a one-cell node, left by any side;
 * - `room`: a room that claims floor, 3×3 with its ring, left by the middle of any side;
 * - `prefab`: a designed room, left by the door place its seat names for each way.
 */
export type Piece =
  { kind: "node"; key: CellKey } | { kind: "room"; key: CellKey } | { kind: "prefab"; key: CellKey; room: EmbedRoom }

/** A drop's own cells, as the sketch draws them from its launch to its landing. */
export type DropCells = { launch: CorridorCell; run: CorridorCell[]; landing: CorridorCell }

/** The corridor between two pieces: its stops in order from `a` to `b` (the nodes it holds that are more than plain
 * corridor), the sketch's corridor cells before each stop and after the last (connectors, and plain corridor nodes,
 * which melt into the string), the way it leaves each end on the sketch, the sketch's cells strictly between its
 * ends, and where on them each stop stands. A drop runs from `a` to `b` and holds no node. `wide` says, for the
 * stretch before each stop and the one after the last, whether it is a wide corridor; a narrow string has none. */
export type FloorString = {
  a: CellKey
  b: CellKey
  dirA: Direction
  dirB: Direction
  nodes: CellKey[]
  runs: CorridorCell[][]
  path: Cell[]
  stopAt: number[]
  drop?: DropCells
  wide?: boolean[]
}

export type FloorGraph = {
  lattice: FloorGrid
  pieces: Map<CellKey, Piece>
  strings: FloorString[]
  entrance: CellKey
  exit: CellKey
}

export const MOVES: Record<Direction, Cell> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
export const keyOf = ([r, c]: readonly [number, number]): CellKey => `${r},${c}`
export const cellOfKey = (key: CellKey): Cell => key.split(",").map(Number) as Cell
export const step = ([r, c]: Cell, dir: Direction, k = 1): Cell => [r + MOVES[dir][0] * k, c + MOVES[dir][1] * k]
export const dirBetween = ([r, c]: Cell, [nr, nc]: Cell): Direction =>
  nr < r ? "n" : nr > r ? "s" : nc > c ? "e" : "w"

/** Every cell strictly between consecutive points that each share a line with the next, the inner points included. */
export const through = (points: readonly Cell[]): Cell[] => {
  const cells: Cell[] = []
  let [r, c] = points[0]
  for (const [tr, tc] of points.slice(1))
    while (r !== tr || c !== tc) {
      r += Math.sign(tr - r)
      c += Math.sign(tc - c)
      cells.push([r, c])
    }
  return cells.slice(0, -1)
}

const asCorridor = (cell: GridCell, at: Cell): CorridorCell => {
  if (cell.type !== "corridor") throw new Error(`[carve] the sketch's connector at ${keyOf(at)} is not a corridor`)
  return cell
}

type Way = { to: CellKey; dir: Direction; connector?: Cell; drop?: { launch: Cell; run: Cell[]; landing: Cell } }

/**
 * THE SKETCH READ AS A GRAPH. Its nodes are the even/even cells a drop does not cross. A node is a piece where it is a
 * designed room, claims floor, is the entrance or the exit, ends a drop, or has other than two ways out; every chain
 * of other nodes between two pieces is one string, and every drop is a string of its own. A stood tile or plate is
 * no part of a sketch: pieces stand on the laid floor, so a sketch carrying one is a pass-order mistake.
 * A stretch of a string between two of its nodes is wide on a `wide` floor, or where the node farther from the
 * entrance asks for a wide way in (`wideWayIn`); a drop is never wide.
 */
export const floorGraph = (
  lattice: FloorGrid,
  rooms: ReadonlyMap<CellKey, EmbedRoom>,
  keep: ReadonlySet<CellKey> = new Set(),
  wide = false
): FloorGraph => {
  const runs = oneWayRuns(lattice)
  const dropCells = new Set(runs.flatMap(run => [run.launch, ...run.cells, run.landing].map(keyOf)))
  const cellAt = ([r, c]: Cell) => lattice.cells[r][c]
  const nodes: CellKey[] = []
  lattice.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "room" && (cell.sequenceTile || cell.plate))
        throw new Error(`[carve] the sketch stands a piece at ${keyOf([r, c])}; pieces stand on the laid floor`)
      if (r % NODE_STEP || c % NODE_STEP || cell.type === "empty" || dropCells.has(keyOf([r, c]))) return
      nodes.push(keyOf([r, c]))
    })
  )
  const isNode = new Set(nodes)
  const ways = new Map<CellKey, Way[]>(nodes.map(key => [key, []]))
  for (const key of nodes) {
    const at = cellOfKey(key)
    const node = cellAt(at)
    if (node.type === "empty") continue
    for (const dir of ["n", "e", "s", "w"] as const) {
      const connector = step(at, dir)
      if (!node.dirs.has(dir) || dropCells.has(keyOf(connector))) continue
      const to = keyOf(step(at, dir, NODE_STEP))
      if (!isNode.has(to)) throw new Error(`[carve] the sketch's way ${dir} of ${key} reaches no node`)
      asCorridor(cellAt(connector), connector)
      ways.get(key)!.push({ to, dir, connector })
    }
  }
  const dropEnds = new Set<CellKey>()
  for (const run of runs) {
    const from = keyOf(step(run.launch, OPPOSITE[run.dir]))
    const to = keyOf(step(run.landing, run.dir))
    if (!isNode.has(from) || !isNode.has(to)) throw new Error(`[carve] the drop at ${keyOf(run.launch)} joins no node`)
    if (rooms.has(from) || rooms.has(to)) throw new Error(`[carve] a drop leaves the designed room at ${from}`)
    ways.get(from)!.push({ to, dir: run.dir, drop: { launch: run.launch, run: run.cells, landing: run.landing } })
    dropEnds.add(from).add(to)
  }

  const entrance = keyOf(lattice.entrancePos)
  const exit = keyOf(lattice.exitPos)
  const landings = new Map<CellKey, number>()
  for (const run of runs) {
    const to = keyOf(step(run.landing, run.dir))
    landings.set(to, (landings.get(to) ?? 0) + 1)
  }
  const pieces = new Map<CellKey, Piece>()
  for (const key of nodes) {
    const [r, c] = cellOfKey(key)
    const room = rooms.get(key)
    const degree = ways.get(key)!.length + (landings.get(key) ?? 0)
    if (room) pieces.set(key, { kind: "prefab", key, room })
    else if (claimsFloorAt(lattice, r, c)) pieces.set(key, { kind: "room", key })
    else if (key === entrance || key === exit || dropEnds.has(key) || degree !== 2)
      pieces.set(key, { kind: "node", key })
  }
  for (const key of rooms.keys())
    if (!pieces.has(key)) throw new Error(`[carve] a designed room is named for ${key}, where the sketch has no node`)
  if (!pieces.has(entrance) || !pieces.has(exit)) throw new Error(`[carve] the sketch's entrance or exit is no node`)

  // A plain node is bare corridor: no room, no gate held open, and nothing the floor names by its place.
  const named = new Set([...keep, keyOf(lattice.entrancePos), keyOf(lattice.exitPos)])
  for (const stair of Object.values(lattice.staircases)) named.add(keyOf(stair))
  for (const row of lattice.cells)
    for (const cell of row)
      if (cell.type === "room" && cell.mechanism) {
        for (const move of cell.mechanism.transitions ?? []) named.add(keyOf(move.at))
        for (const stand of cell.mechanism.underfoot ?? []) named.add(keyOf(stand.at))
      }
  const plain = (at: Cell) => {
    const cell = cellAt(at)
    return cell.type === "corridor" && !cell.openGate && !cell.prefabRoom && !cell.obstacle && !named.has(keyOf(at))
  }
  const strings: FloorString[] = []
  const walked = new Set<string>()
  for (const a of pieces.keys())
    for (const first of ways.get(a)!) {
      if (walked.has(`${a}>${first.dir}`)) continue
      if (first.drop) {
        const { launch, run, landing } = first.drop
        strings.push({
          a,
          b: first.to,
          dirA: first.dir,
          dirB: OPPOSITE[first.dir],
          nodes: [],
          runs: [],
          path: [launch, ...run, landing],
          stopAt: [],
          drop: {
            launch: asCorridor(cellAt(launch), launch),
            run: run.map(cell => asCorridor(cellAt(cell), cell)),
            landing: asCorridor(cellAt(landing), landing),
          },
        })
        continue
      }
      const inner: CellKey[] = []
      const path: Cell[] = [first.connector!]
      let way = first
      while (!pieces.has(way.to)) {
        if (inner.length > nodes.length)
          throw new Error(`[carve] the sketch's way from ${a} by ${first.dir} never ends`)
        const at = way.to
        const back = OPPOSITE[way.dir]
        inner.push(at)
        way = ways.get(at)!.find(next => next.dir !== back)!
        path.push(cellOfKey(at), way.connector!)
      }
      walked.add(`${a}>${first.dir}`).add(`${way.to}>${OPPOSITE[way.dir]}`)
      const stopAt: number[] = []
      const runs: CorridorCell[][] = [[]]
      path.forEach((cell, i) => {
        if (i % 2 === 1 && !plain(cell)) {
          stopAt.push(i)
          runs.push([])
        } else runs[runs.length - 1].push(asCorridor(cellAt(cell), cell))
      })
      strings.push({
        a,
        b: way.to,
        dirA: first.dir,
        dirB: OPPOSITE[way.dir],
        nodes: stopAt.map(i => keyOf(path[i])),
        runs,
        path,
        stopAt,
      })
    }
  widen(lattice, strings, entrance, wide)
  return { lattice, pieces, strings, entrance, exit }
}

/** Marks each wide stretch of each string, by how far along the sketch its ends lie from the entrance. */
const widen = (lattice: FloorGrid, strings: FloorString[], entrance: CellKey, wide: boolean) => {
  const asks = (key: CellKey) => {
    const [r, c] = cellOfKey(key)
    const cell = lattice.cells[r][c]
    return cell.type === "room" && !!cell.wideWayIn
  }
  const stretches = strings.flatMap(s => {
    if (s.drop) return []
    const ends = [s.a, ...s.nodes, s.b]
    const at = [-1, ...s.stopAt, s.path.length]
    return ends.slice(1).map((to, j) => ({ from: ends[j], to, length: at[j + 1] - at[j] }))
  })
  if (!wide && !stretches.some(({ from, to }) => asks(from) || asks(to))) return
  const near = new Map<CellKey, [CellKey, number][]>()
  const link = (x: CellKey, y: CellKey, length: number) => (near.get(x) ?? near.set(x, []).get(x)!).push([y, length])
  for (const s of strings) if (s.drop) link(s.a, s.b, s.path.length + 1)
  for (const { from, to, length } of stretches) {
    link(from, to, length)
    link(to, from, length)
  }
  const distance = new Map<CellKey, number>([[entrance, 0]])
  const done = new Set<CellKey>()
  for (;;) {
    let next: CellKey | undefined
    for (const [key, d] of distance) if (!done.has(key) && (next === undefined || d < distance.get(next)!)) next = key
    if (next === undefined) break
    done.add(next)
    for (const [to, length] of near.get(next) ?? [])
      if (distance.get(next)! + length < (distance.get(to) ?? Infinity)) distance.set(to, distance.get(next)! + length)
  }
  const far = (from: CellKey, to: CellKey) => {
    const [df, dt] = [distance.get(from) ?? Infinity, distance.get(to) ?? Infinity]
    return df > dt ? [from] : dt > df ? [to] : [from, to]
  }
  for (const s of strings) {
    if (s.drop) continue
    const ends = [s.a, ...s.nodes, s.b]
    const flags = ends.slice(1).map((to, j) => wide || far(ends[j], to).some(asks))
    if (flags.some(Boolean)) s.wide = flags
  }
}
