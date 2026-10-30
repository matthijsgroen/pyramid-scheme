import type { CellRect, Direction, FloorGrid, GridCell } from "../../siteTypes"
import { OPPOSITE } from "../grid"
import type { Cell } from "../state"
import { cellOfKey, keyOf, type CellKey } from "./graph"
import { doorRay, footprint, type Layout } from "./layout"

export type Carved = {
  grid: FloorGrid
  /** Each designed room's inside of the ring, by sketch node, as `stampPrefab` takes it. */
  prefabRects: Map<CellKey, CellRect>
  /** Where each sketch node stands on the floor. */
  nodes: Map<CellKey, Cell>
}

const dirBetween = ([r, c]: Cell, [nr, nc]: Cell): Direction => (nr < r ? "n" : nr > r ? "s" : nc > c ? "e" : "w")
const add = ([r, c]: Cell, [dr, dc]: Cell): Cell => [r + dr, c + dc]

/** Every cell of a polyline strictly between its first and last corner. */
const between = (corners: readonly Cell[]): Cell[] => {
  const cells: Cell[] = []
  let [r, c] = corners[0]
  for (const [tr, tc] of corners.slice(1))
    while (r !== tr || c !== tc) {
      r += Math.sign(tr - r)
      c += Math.sign(tc - c)
      cells.push([r, c])
    }
  return cells.slice(0, -1)
}

/**
 * THE LAYOUT CARVED INTO A GRID. Each piece's node keeps every field of its sketch cell where the layout put it. Each
 * string becomes corridor: its cells from node to node, out through each end's door place, take the labels of the
 * sketch connector they stand for, and its nodes stand where the layout put them; a drop lays its launch, run and landing, the run walked by nothing, any cells before its launch
 * plain corridor. `dirs` follow the strings. A room's
 * `exits` turn with the ways they name, and a mechanism's places, the entrance, the exit and the stairs move with
 * their nodes. The grid is trimmed to what the pieces and strings claim, plus a margin of one cell.
 */
export const carveLayout = (layout: Layout): Carved => {
  const { graph, blocks } = layout
  const { lattice, pieces } = graph
  const sketch = (cell: Cell) => lattice.cells[cell[0]][cell[1]]
  const prints = new Map([...pieces].map(([key, piece]) => [key, footprint(piece)]))

  const nodes = new Map<CellKey, Cell>()
  type Laid = { at: Cell; cell: GridCell; ways: Set<Direction> }
  const laid = new Map<string, Laid>()
  const claimed: Cell[] = []
  const put = (at: Cell, cell: GridCell) => {
    if (laid.has(keyOf(at))) throw new Error(`[carve] the layout laid two things at ${keyOf(at)}`)
    laid.set(keyOf(at), { at, cell, ways: new Set() })
  }
  const link = (from: Cell, to: Cell) => {
    const dir = dirBetween(from, to)
    laid.get(keyOf(from))!.ways.add(dir)
    laid.get(keyOf(to))!.ways.add(OPPOSITE[dir])
  }
  for (const [key] of pieces) {
    const { origin } = prints.get(key)!
    const [r, c] = cellOfKey(key)
    const top = blocks.get(key)!
    const at: Cell = [r - origin[0] + top[0], c - origin[1] + top[1]]
    nodes.set(key, at)
    claimed.push(...prints.get(key)!.used.map(cell => add(top, cell)))
    put(at, sketch([r, c]))
  }

  // Each node's ways on the sketch, by the way it leaves on the floor.
  const turned = new Map<CellKey, Map<Direction, Direction>>()
  const turn = (node: CellKey, sketchDir: Direction, floorDir: Direction) =>
    (turned.get(node) ?? turned.set(node, new Map()).get(node)!).set(sketchDir, floorDir)

  graph.strings.forEach((s, si) => {
    const { corners, stops } = layout.strings[si]
    const rayOf = (end: CellKey, door: Cell, toward: Cell) => {
      const side = dirBetween(door, toward)
      const ray = doorRay(pieces.get(end)!, side)
      if (!ray) throw new Error(`[carve] the layout leaves ${end} by ${side}, where it has no door place`)
      return { side, cells: ray.map(cell => add(blocks.get(end)!, cell)) }
    }
    const fromA = rayOf(s.a, corners[0], corners[1])
    const fromB = rayOf(s.b, corners[corners.length - 1], corners[corners.length - 2])
    const inner = between(corners)
    const path = [...fromA.cells, ...inner, ...[...fromB.cells].reverse()]
    const walk = [nodes.get(s.a)!, ...path, nodes.get(s.b)!]
    turn(s.a, s.dirA, fromA.side)
    turn(s.b, s.dirB, fromB.side)
    if (s.drop) {
      const { launch, run, landing } = s.drop
      const pad = path.length - run.length - 2
      if (pad < 0) throw new Error(`[carve] the drop from ${s.a} is shorter than its run`)
      ;[...Array.from({ length: pad }, () => launch), launch, ...run, landing].forEach((cell, k) => put(path[k], cell))
      const onRun = (k: number) => k > pad + 1 && k < walk.length - 2
      for (let k = 1; k < walk.length; k++) if (!onRun(k - 1) && !onRun(k)) link(walk[k - 1], walk[k])
      return
    }
    const index = new Map(path.map((cell, i) => [keyOf(cell), i]))
    const places = stops.map(stop => {
      const i = index.get(keyOf(stop))
      if (i === undefined) throw new Error(`[carve] a node of the string from ${s.a} stands off its way`)
      return i
    })
    let segment = 0
    path.forEach((cell, i) => {
      if (places[segment] !== i) return put(cell, s.connectors[segment])
      const node = s.nodes[segment]
      nodes.set(node, cell)
      put(cell, sketch(cellOfKey(node)))
      segment++
    })
    for (let k = 1; k < walk.length; k++) link(walk[k - 1], walk[k])
    s.nodes.forEach((node, i) => {
      const k = places[i] + 1
      const sketchAt = s.path[2 * i + 1]
      turn(node, dirBetween(sketchAt, s.path[2 * i]), dirBetween(walk[k], walk[k - 1]))
      turn(node, dirBetween(sketchAt, s.path[2 * i + 2]), dirBetween(walk[k], walk[k + 1]))
    })
  })

  const all = [...claimed, ...[...laid.values()].map(({ at }) => at)]
  const top = Math.min(...all.map(([r]) => r)) - 1
  const left = Math.min(...all.map(([, c]) => c)) - 1
  const rows = Math.max(...all.map(([r]) => r)) - top + 2
  const cols = Math.max(...all.map(([, c]) => c)) - left + 2
  const shift = ([r, c]: readonly [number, number]): [number, number] => [r - top, c - left]
  const moved = new Map([...nodes].map(([key, at]) => [key, shift(at)]))
  const placed = (pos: readonly [number, number]): [number, number] => {
    const at = moved.get(keyOf(pos))
    if (!at) throw new Error(`[carve] ${keyOf(pos)} is named on the sketch but is no node`)
    return at
  }

  const cells: GridCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): GridCell => ({ type: "empty" }))
  )
  for (const { at, cell, ways } of laid.values()) {
    if (cell.type === "empty") continue
    const [r, c] = shift(at)
    cells[r][c] = { ...cell, dirs: ways }
  }
  for (const [node, ways] of turned) {
    const [r, c] = moved.get(node)!
    const cell = cells[r][c]
    if (cell.type !== "room" || !cell.exits) continue
    cells[r][c] = { ...cell, exits: cell.exits.map(exit => ({ ...exit, dir: ways.get(exit.dir) ?? exit.dir })) }
  }
  for (const [, [r, c]] of moved) {
    const cell = cells[r][c]
    if (cell.type !== "room" || !cell.mechanism) continue
    const { transitions, underfoot } = cell.mechanism
    if (!transitions && !underfoot) continue
    cells[r][c] = {
      ...cell,
      mechanism: {
        ...cell.mechanism,
        ...(transitions ? { transitions: transitions.map(move => ({ ...move, at: placed(move.at) })) } : {}),
        ...(underfoot ? { underfoot: underfoot.map(stand => ({ ...stand, at: placed(stand.at) })) } : {}),
      },
    }
  }

  const prefabRects = new Map<CellKey, CellRect>()
  for (const [key, piece] of pieces) {
    if (piece.kind !== "prefab") continue
    const [r, c] = shift(blocks.get(key)!)
    prefabRects.set(key, { top: r + 1, left: c + 1, rows: piece.room.rows - 2, cols: piece.room.cols - 2 })
  }
  return {
    grid: {
      ...lattice,
      rows,
      cols,
      cells,
      entrancePos: placed(lattice.entrancePos),
      exitPos: placed(lattice.exitPos),
      staircases: Object.fromEntries(Object.entries(lattice.staircases).map(([id, stair]) => [id, placed(stair)])),
    },
    prefabRects,
    nodes: moved,
  }
}
