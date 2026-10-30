import { mulberry32 } from "../../random"
import type { Direction } from "../../siteTypes"
import { OPPOSITE } from "../grid"
import type { Cell } from "../state"
import { cellOfKey, keyOf, loopHeld, type CellKey, type FloorGraph, type FloorString, type Piece } from "./graph"

/** How far a string's draw reaches past its nodes' need at full spread. */
export const GAP_RANGE = 6
/** How often a stop re-places its subtree before it gives up, and how often the floor lays out afresh. */
export const SUBTREE_TRIES = 8
export const FLOOR_ATTEMPTS = 16
/** The candidates one attempt may try per stop before it gives up. */
const ATTEMPT_BUDGET = 400
/** The most free ground a stop looks for below it before it counts as room enough. */
const ROOM_LOOK = 120
/** How much longer than its draw a leg may run to find room. */
const DETOURS = [0, 2, 4, 8]

const LAYOUT_SALT = 0x5bd1e995
const MOVES: Record<Direction, Cell> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const SIDES: Direction[] = ["n", "e", "s", "w"]
const TURNS: Record<Direction, Direction[]> = { n: ["e", "w"], s: ["e", "w"], e: ["n", "s"], w: ["n", "s"] }
const add = ([r, c]: Cell, [dr, dc]: Cell): Cell => [r + dr, c + dc]
const step = (at: Cell, dir: Direction, k = 1): Cell => [at[0] + MOVES[dir][0] * k, at[1] + MOVES[dir][1] * k]
const dirBetween = ([r, c]: Cell, [nr, nc]: Cell): Direction => (nr < r ? "n" : nr > r ? "s" : nc > c ? "e" : "w")

/** A string as laid: its corner cells from its `a` end's door place to its `b` end's, and where each of its nodes
 * stands, in order. */
export type LaidString = { corners: Cell[]; stops: Cell[] }

/** Where each piece's top-left stands and how each string runs; `attempts` counts the floor attempts it took. */
export type Layout = { graph: FloorGraph; blocks: Map<CellKey, Cell>; strings: LaidString[]; attempts: number }

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

/** The cells a string needs between its door places: two per node, plus one; a drop its launch, run and landing,
 * less what its ends' rings hold. */
export const needOf = (s: FloorString, rayA: number, rayB: number): number =>
  s.drop ? s.drop.run.length + 2 - rayA - rayB : 2 * s.nodes.length + 1

type Leg = { dir: Direction; len: number }
const walkLegs = (door: Cell, legs: readonly Leg[]): Cell[] => {
  const cells: Cell[] = []
  let at = door
  for (const { dir, len } of legs)
    for (let k = 0; k < len; k++) {
      at = step(at, dir)
      cells.push(at)
    }
  return cells
}

/** Every cell strictly between consecutive points that each share a line with the next, the inner points included. */
const through = (points: readonly Cell[]): Cell[] => {
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

const cornersOf = (doorA: Cell, cells: readonly Cell[], doorB: Cell): Cell[] => {
  const all = [doorA, ...cells, doorB]
  return all.filter(
    (cell, i) => i === 0 || i === all.length - 1 || dirBetween(all[i - 1], cell) !== dirBetween(cell, all[i + 1])
  )
}

const shuffled = <T>(items: readonly T[], rand: () => number): T[] => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** `parts` lengths of at least one summing to `total`, cut at seeded places. */
const cut = (total: number, parts: number, rand: () => number): number[] | undefined => {
  if (total < parts) return undefined
  if (parts === 1) return [total]
  const first = 1 + Math.floor(rand() * (total - parts + 1))
  return [first, ...cut(total - first, parts - 1, rand)!]
}

/** A cell as one number, for the layout's own bookkeeping. */
const SPAN = 1 << 14
const ck = ([r, c]: Cell): number => (r + SPAN / 2) * SPAN + c + SPAN / 2
const cellAt = (k: number): Cell => [Math.floor(k / SPAN) - SPAN / 2, (k % SPAN) - SPAN / 2]

type Box = { top: number; bottom: number; left: number; right: number }
const bounds = (keys: Iterable<number>, start?: Box): Box => {
  const box = start ? { ...start } : { top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity }
  for (const key of keys) {
    const [r, c] = cellAt(key)
    box.top = Math.min(box.top, r)
    box.bottom = Math.max(box.bottom, r)
    box.left = Math.min(box.left, c)
    box.right = Math.max(box.right, c)
  }
  return box
}
/** How much a box has grown: its longer side first, so a floor grows square rather than along one side, then its area. */
const growth = (box: Box) => {
  const [rows, cols] = [box.bottom - box.top + 1, box.right - box.left + 1]
  return Math.max(rows, cols) * 1e6 + rows * cols
}

/** Who holds a cell: `p:key` for a block, `g:index` for a leg, with a leg cell's place along it. */
type Holder = { owner: string; index: number; last: number }
type Hold = Map<number, Holder>
/** A leg as laid from its parent's door place: its runs, and the length compaction keeps it at or above. */
type Line = { door: Cell; legs: Leg[]; need: number }
/** One leg of a string the tree holds, between two of its stops (its end pieces and its nodes). */
type Segment = { si: number; a: CellKey; b: CellKey; fixedA?: Direction; fixedB?: Direction }

/**
 * A block of the layout: one piece, one node of a string, or every piece a loop joins with the strings between them.
 * `pieces` and `nodes` give where each of its pieces' top-left and each of its nodes stands, `inside` how each string
 * within it runs, all as offsets from its top-left. A block of one piece or node is left by any side it has a way out
 * by; a loop's block keeps the sketch's sides.
 */
type Block = {
  key: CellKey
  used: Cell[]
  pieces: Map<CellKey, Cell>
  nodes: Map<CellKey, Cell>
  inside: Map<number, LaidString>
  free: boolean
}

const single = (piece: Piece): Block => ({
  key: piece.key,
  used: footprint(piece).used,
  pieces: new Map([[piece.key, [0, 0]]]),
  nodes: new Map([[piece.key, nodeOffset(piece)]]),
  inside: new Map(),
  free: piece.kind !== "prefab",
})

/**
 * THE PIECES A LOOP JOINS, AS ONE BLOCK: the sketch's own shape at a pitch wide enough that no two of its pieces
 * touch (`2 * reach + 2`, `reach` the furthest any piece reaches from its node), each string inside it running
 * straight from node to node. A drop inside it walks plain corridor before its launch where the pitch leaves more room
 * than its run.
 */
const loopBlock = (graph: FloorGraph, pieceKeys: readonly CellKey[], inside: readonly number[]): Block => {
  const pieces = pieceKeys.map(key => graph.pieces.get(key)!)
  const reach = Math.max(
    0,
    ...pieces.map(piece => {
      if (piece.kind === "node") return 0
      if (piece.kind === "room") return 1
      const { rows, cols, node } = piece.room
      return Math.max(node[0], node[1], rows - 1 - node[0], cols - 1 - node[1])
    })
  )
  const pitch = 2 * reach + 2
  const scaled = (key: CellKey): Cell => {
    const [r, c] = cellOfKey(key)
    return [(r / 2) * pitch, (c / 2) * pitch]
  }
  const nodes = new Map<CellKey, Cell>()
  const placedPieces = new Map<CellKey, Cell>()
  const used: Cell[] = []
  for (const piece of pieces) {
    const at = scaled(piece.key)
    nodes.set(piece.key, at)
    const topLeft: Cell = [at[0] - nodeOffset(piece)[0], at[1] - nodeOffset(piece)[1]]
    placedPieces.set(piece.key, topLeft)
    used.push(...footprint(piece).used.map(cell => add(topLeft, cell)))
  }
  const laid = new Map<number, LaidString>()
  for (const si of inside) {
    const s = graph.strings[si]
    for (const node of s.nodes) nodes.set(node, scaled(node))
    const door = (end: CellKey, side: Direction) => {
      const piece = graph.pieces.get(end)!
      const ray = doorRay(piece, side)!
      return ray.length ? add(placedPieces.get(end)!, ray[ray.length - 1]) : nodes.get(end)!
    }
    const [doorA, doorB] = [door(s.a, s.dirA), door(s.b, s.dirB)]
    const stops = s.nodes.map(node => nodes.get(node)!)
    const cells = through([doorA, ...stops, doorB])
    used.push(...cells)
    laid.set(si, { corners: cornersOf(doorA, cells, doorB), stops })
  }
  const top = Math.min(...used.map(([r]) => r))
  const left = Math.min(...used.map(([, c]) => c))
  const shift = ([r, c]: Cell): Cell => [r - top, c - left]
  return {
    key: pieceKeys[0],
    used: [...new Map(used.map(cell => [keyOf(shift(cell)), shift(cell)])).values()],
    pieces: new Map([...placedPieces].map(([key, at]) => [key, shift(at)])),
    nodes: new Map([...nodes].map(([key, at]) => [key, shift(at)])),
    inside: new Map(
      [...laid].map(([si, { corners, stops }]) => [si, { corners: corners.map(shift), stops: stops.map(shift) }])
    ),
    free: false,
  }
}

/** The cells of a block no way from outside its box reaches: the faces its loops close. */
const enclosed = (unit: Block): Set<string> => {
  const used = new Set(unit.used.map(keyOf))
  const rows = Math.max(...unit.used.map(([r]) => r)) + 1
  const cols = Math.max(...unit.used.map(([, c]) => c)) + 1
  const outside = new Set<string>()
  const queue: Cell[] = [[-1, -1]]
  outside.add(keyOf([-1, -1]))
  while (queue.length) {
    const at = queue.pop()!
    for (const dir of SIDES) {
      const [r, c] = step(at, dir)
      if (r < -1 || c < -1 || r > rows || c > cols || used.has(keyOf([r, c])) || outside.has(keyOf([r, c]))) continue
      outside.add(keyOf([r, c]))
      queue.push([r, c])
    }
  }
  const faces = new Set<string>()
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) if (!used.has(keyOf([r, c])) && !outside.has(keyOf([r, c]))) faces.add(keyOf([r, c]))
  return faces
}

/** The string `cut` and every string reached past its end `far` without it. */
const beyond = (graph: FloorGraph, cut: number, far: CellKey): number[] => {
  const near = new Map<CellKey, number[]>()
  graph.strings.forEach((s, si) => {
    if (si === cut) return
    for (const end of [s.a, s.b]) near.set(end, [...(near.get(end) ?? []), si])
  })
  const reach = (from: CellKey) => {
    const seen = new Set([from])
    const found = new Set<number>()
    const queue = [from]
    while (queue.length)
      for (const si of near.get(queue.pop()!) ?? []) {
        found.add(si)
        for (const end of [graph.strings[si].a, graph.strings[si].b])
          if (!seen.has(end)) {
            seen.add(end)
            queue.push(end)
          }
      }
    return found
  }
  return [cut, ...reach(far)]
}

/**
 * THE FLOOR'S GRAPH GIVEN POSITIONS. The pieces a loop joins become one block that keeps the sketch's shape
 * (`loopBlock`); every other piece, and every node of a string between blocks, is a block of its own, and the strings
 * between blocks form a tree grown from the entrance. A string is laid leg by leg between its stops (its end pieces and
 * its nodes, each node a one-cell joint where it may turn). The main path to the exit is laid first, then each side
 * subtree depth-first. Each stop hangs on the one before it through its leg, which leaves that stop's door place on a
 * side and reaches the next one's facing door place:
 * - a leg runs at least one cell, a drop exactly its launch, run and landing, so a string runs its need (`needOf`);
 *   `round(spread * GAP_RANGE * u)` cells more, u in [0.5, 1.5), are shared out over a string's legs;
 * - with chance `straightness` a leg runs straight, otherwise it takes one bend (an L) or two (a Z or a U) at seeded
 *   places; a drop never bends;
 * - candidates (shape, side, bend, and a longer run where the drawn one finds no room) whose cells are free are taken
 *   those leaving the child room for its subtree first (`roomFor`), then the rolled shape, then the order that grows
 *   the floor's bounding box least, the seeded order breaking ties. Free: no cell held, and none next to another
 *   block's or leg's but where a leg's end cell meets its own stop.
 * A stop no candidate fits makes its parent re-place its subtree, at most `SUBTREE_TRIES` times; past that the attempt
 * ends. Then, in placing order, each subtree slides one cell toward its parent wherever its leg can lose a cell above
 * its drawn length and every cell stays free, until none moves. A floor that will not lay out tries again from
 * `seed ^ attempt`, up to `FLOOR_ATTEMPTS` times, then is refused naming the stop that found no room.
 */
export const layoutFloor = (
  graph: FloorGraph,
  opts: { seed: number; spread: number; straightness: number }
): Layout | { refused: string } => {
  const { strings } = graph
  const onLoop = loopHeld(graph)

  // The blocks: each loop's pieces together, every other piece alone, and every node of a string between blocks. A
  // side branch that leaves a loop's block into a face the loop closes is laid inside the block with it.
  const held = new Set(onLoop)
  const blocks = new Map<CellKey, Block>()
  const blockOf = new Map<CellKey, CellKey>()
  for (;;) {
    blocks.clear()
    blockOf.clear()
    const group = new Map([...graph.pieces.keys()].map(key => [key, key]))
    const root = (key: CellKey): CellKey => (group.get(key) === key ? key : root(group.get(key)!))
    strings.forEach((s, si) => {
      const [ra, rb] = [root(s.a), root(s.b)]
      if (held.has(si) && ra !== rb) group.set(rb, ra)
    })
    const members = new Map<CellKey, CellKey[]>()
    for (const key of graph.pieces.keys()) members.set(root(key), [...(members.get(root(key)) ?? []), key])
    for (const [head, keys] of members) {
      const inside = strings.flatMap((s, si) => (held.has(si) && root(s.a) === head ? [si] : []))
      const unit = inside.length ? loopBlock(graph, keys, inside) : single(graph.pieces.get(head)!)
      blocks.set(unit.key, unit)
      for (const key of unit.nodes.keys()) blockOf.set(key, unit.key)
    }
    const faces = new Map<CellKey, Set<string>>()
    const facesOf = (unit: Block) => faces.get(unit.key) ?? faces.set(unit.key, enclosed(unit)).get(unit.key)!
    const into = (end: CellKey, dir: Direction) => {
      const unit = blocks.get(blockOf.get(end)!)!
      if (unit.free || unit.inside.size === 0) return false
      const ray = doorRay(graph.pieces.get(end)!, dir)!
      const door = ray.length ? add(unit.pieces.get(end)!, ray[ray.length - 1]) : unit.nodes.get(end)!
      return facesOf(unit).has(keyOf(step(door, dir)))
    }
    const inward = strings.findIndex((s, si) => !held.has(si) && (into(s.a, s.dirA) || into(s.b, s.dirB)))
    if (inward < 0) break
    const { a, dirA } = strings[inward]
    for (const si of beyond(graph, inward, into(a, dirA) ? strings[inward].b : a)) held.add(si)
  }
  const segments: Segment[] = []
  strings.forEach((s, si) => {
    if (held.has(si)) return
    const chain = [s.a, ...s.nodes, s.b]
    for (const node of s.nodes) {
      const unit = single({ kind: "node", key: node })
      blocks.set(node, unit)
      blockOf.set(node, node)
    }
    // Each stop's way toward the next and back, as the sketch draws it.
    const toward = (j: number, k: number) =>
      s.drop ? (j === 0 ? s.dirA : s.dirB) : dirBetween(cellOfKey(chain[j]), s.path[2 * Math.min(j, k)])
    for (let j = 0; j + 1 < chain.length; j++) {
      const fixed = (key: CellKey) => s.drop || !blocks.get(blockOf.get(key)!)!.free
      segments.push({
        si,
        a: chain[j],
        b: chain[j + 1],
        ...(fixed(chain[j]) ? { fixedA: toward(j, j + 1) } : {}),
        ...(fixed(chain[j + 1]) ? { fixedB: toward(j + 1, j) } : {}),
      })
    }
  })

  // The tree of blocks, from the entrance's block, the main path's child first.
  const near = new Map<CellKey, number[]>()
  segments.forEach((g, i) => {
    for (const end of [g.a, g.b]) near.set(blockOf.get(end)!, [...(near.get(blockOf.get(end)!) ?? []), i])
  })
  const rootKey = blockOf.get(graph.entrance)!
  const parentSeg = new Map<CellKey, number>()
  const parentOf = new Map<CellKey, CellKey>()
  const found: CellKey[] = [rootKey]
  for (let i = 0; i < found.length; i++)
    for (const gi of near.get(found[i]) ?? []) {
      const g = segments[gi]
      const other = blockOf.get(blockOf.get(g.a) === found[i] ? g.b : g.a)!
      if (other === rootKey || parentSeg.has(other)) continue
      parentSeg.set(other, gi)
      parentOf.set(other, found[i])
      found.push(other)
    }
  if (found.length !== blocks.size) throw new Error("[carve] the floor's pieces do not hang together")
  const main = new Set<CellKey>([rootKey])
  for (let at = blockOf.get(graph.exit)!; at !== rootKey; at = parentOf.get(at)!) main.add(at)
  const children = new Map<CellKey, CellKey[]>()
  for (const key of found.slice(1)) children.set(parentOf.get(key)!, [...(children.get(parentOf.get(key)!) ?? []), key])
  for (const [key, kids] of children)
    children.set(key, [...kids.filter(kid => main.has(kid)), ...kids.filter(kid => !main.has(kid))])
  const subtree = new Map<CellKey, CellKey[]>()
  const order: CellKey[] = []
  const collect = (key: CellKey): CellKey[] => {
    order.push(key)
    const all = [key, ...(children.get(key) ?? []).flatMap(collect)]
    subtree.set(key, all)
    return all
  }
  collect(rootKey)
  const ends = new Map<string, [string, string]>(
    [...parentSeg].map(([key, gi]) => [`g:${gi}`, [`p:${parentOf.get(key)}`, `p:${key}`]])
  )
  // A drop fixes the side it leaves a one-cell node or a room by, so no other leg takes that side.
  const reserved = new Map<CellKey, Set<Direction>>()
  for (const s of strings)
    if (s.drop)
      for (const [end, dir] of [
        [s.a, s.dirA],
        [s.b, s.dirB],
      ] as const)
        reserved.set(end, (reserved.get(end) ?? new Set<Direction>()).add(dir))
  // The free ground a stop's subtree wants below it: three cells for each cell its blocks claim, and one more
  // each, looked for up to `ROOM_LOOK` cells.
  const roomNeed = new Map(
    [...subtree].map(([key, all]) => [
      key,
      Math.min(
        ROOM_LOOK,
        all.filter(below => below !== key).reduce((sum, below) => sum + 3 * (blocks.get(below)!.used.length + 1), 0)
      ),
    ])
  )
  const corners = new Map(
    [...blocks].map(([key, { used }]) => [
      key,
      [Math.max(...used.map(([r]) => r)), Math.max(...used.map(([, c]) => c))] as Cell,
    ])
  )
  const owned = (key: CellKey, at: Cell) => blocks.get(key)!.used.map(cell => add(at, cell))
  /** The way a string's end at `node` leaves its block by `side`: its door place and the cells inside the block out
   * to it, as offsets from the block's top-left, or undefined where it has no way out there. */
  const port = (node: CellKey, side: Direction) => {
    const unit = blocks.get(blockOf.get(node)!)!
    const piece = graph.pieces.get(node) ?? { kind: "node" as const, key: node }
    const base = unit.pieces.get(node) ?? [0, 0]
    const ray = doorRay(piece, side)
    if (!ray) return undefined
    const cells = ray.map(cell => add(base, cell))
    return { ray: cells, door: cells.length ? cells[cells.length - 1] : unit.nodes.get(node)! }
  }

  /** Whether `fresh` may be taken over `hold`: no cell held, and none next to another holder's but where a leg's end
   * cell meets its own stop. */
  const fits = (hold: Hold, fresh: Hold) => {
    const meets = (x: Holder, other: string) => {
      const pair = ends.get(x.owner)
      return pair !== undefined && ((x.index === 0 && other === pair[0]) || (x.index === x.last && other === pair[1]))
    }
    for (const [key, here] of fresh) {
      if (hold.has(key)) return false
      const at = cellAt(key)
      for (const dir of SIDES) {
        const nk = ck(step(at, dir))
        const there = fresh.get(nk) ?? hold.get(nk)
        if (!there) continue
        if (there.owner === here.owner) {
          if (here.owner.startsWith("p:") || Math.abs(there.index - here.index) === 1) continue
          return false
        }
        if (meets(here, there.owner) || meets(there, here.owner)) continue
        return false
      }
    }
    return true
  }

  let failure = `no room for the piece at ${graph.entrance}`
  for (let attempt = 0; attempt < FLOOR_ATTEMPTS; attempt++) {
    const rand = mulberry32(opts.seed ^ attempt ^ LAYOUT_SALT)
    let budget = ATTEMPT_BUDGET * blocks.size
    // Set once a stop has re-placed its subtree `SUBTREE_TRIES` times: the attempt is over.
    let spent = false
    const at = new Map<CellKey, Cell>()
    const sides = new Map<CellKey, Set<Direction>>()
    const lines = new Map<number, Line>()
    const hold: Hold = new Map()
    const drawn = strings.map(() => Math.round(opts.spread * GAP_RANGE * (0.5 + rand())))
    const share = segments.map(g => {
      const s = strings[g.si]
      const parts = s.nodes.length + 1
      const j = g.a === s.a ? 0 : s.nodes.indexOf(g.a) + 1
      return Math.floor((drawn[g.si] * (j + 1)) / parts) - Math.floor((drawn[g.si] * j) / parts)
    })
    const bends = segments.map(() => (rand() < opts.straightness ? 0 : rand() < 0.5 ? 1 : 2))

    const blockCells = (key: CellKey, shift: Cell = [0, 0]): [number, Holder][] =>
      owned(key, add(at.get(key)!, shift)).map(cell => [ck(cell), { owner: `p:${key}`, index: 0, last: 0 }])
    const legCells = (gi: number, line: Line, shift: Cell = [0, 0]): [number, Holder][] => {
      const cells = walkLegs(add(line.door, shift), line.legs)
      return cells.map((cell, index) => [ck(cell), { owner: `g:${gi}`, index, last: cells.length - 1 }])
    }
    /** Every placed cell of `key`'s subtree below its own leg, moved by `shift`. */
    const subtreeCells = (key: CellKey, shift: Cell = [0, 0]): [number, Holder][] =>
      subtree
        .get(key)!
        .flatMap(below =>
          at.has(below)
            ? [
                ...blockCells(below, shift),
                ...(below === key ? [] : legCells(parentSeg.get(below)!, lines.get(parentSeg.get(below)!)!, shift)),
              ]
            : []
        )
    const sideOf = (key: CellKey) => sides.get(key) ?? sides.set(key, new Set()).get(key)!
    /** The box the placed blocks span. */
    const placedBox = (): Box =>
      bounds([...at].flatMap(([key, topLeft]) => [ck(topLeft), ck(add(topLeft, corners.get(key)!))]))
    /** Whether the free ground a child at `topLeft` reaches, by cells nothing holds or touches, holds its subtree. */
    const roomFor = (child: CellKey, topLeft: Cell, fresh: Hold): boolean => {
      const need = roomNeed.get(child)!
      if (need === 0) return true
      const held = (k: number) => fresh.get(k) ?? hold.get(k)
      const own = `p:${child}`
      const free = (k: number) => {
        if (held(k)) return false
        const cell = cellAt(k)
        return SIDES.every(dir => {
          const there = held(ck(step(cell, dir)))
          return !there || there.owner === own
        })
      }
      const seen = new Set<number>()
      const queue: number[] = []
      const visit = (k: number) => {
        if (seen.has(k) || !free(k)) return
        seen.add(k)
        queue.push(k)
      }
      for (const cell of owned(child, topLeft)) for (const dir of SIDES) visit(ck(step(cell, dir)))
      for (let i = 0; i < queue.length && seen.size < need; i++)
        for (const dir of SIDES) visit(ck(step(cellAt(queue[i]), dir)))
      return seen.size >= need
    }

    function* candidates(child: CellKey, extra: number) {
      const gi = parentSeg.get(child)!
      const g = segments[gi]
      const s = strings[g.si]
      const parent = parentOf.get(child)!
      const childAtA = blockOf.get(g.a) === child
      const [parentNode, childNode] = childAtA ? [g.b, g.a] : [g.a, g.b]
      const parentFixed = childAtA ? g.fixedB : g.fixedA
      const childFixed = childAtA ? g.fixedA : g.fixedB
      const rolled = s.drop ? 0 : bends[gi]
      const shapes = s.drop ? [0] : [rolled, ...[0, 1, 2].filter(b => b !== rolled)]
      const order = parentFixed
        ? [parentFixed]
        : shuffled(
            SIDES.filter(side => !sideOf(parent).has(side) && !reserved.get(parentNode)?.has(side)),
            rand
          )
      for (const shape of shapes)
        for (const side of order) {
          const out = port(parentNode, side)
          if (!out) continue
          const door = add(at.get(parent)!, out.door)
          const turns = shuffled(TURNS[side], rand)
          const patterns: Direction[][] =
            shape === 0
              ? [[side]]
              : shape === 1
                ? turns.map(t => [side, t])
                : turns.flatMap(t =>
                    shuffled(
                      [
                        [side, t, side],
                        [side, t, OPPOSITE[side]],
                      ],
                      rand
                    )
                  )
          for (const dirs of patterns) {
            const last = dirs[dirs.length - 1]
            const childSide = OPPOSITE[last]
            if (childFixed ? childFixed !== childSide : reserved.get(childNode)?.has(childSide)) continue
            const into = port(childNode, childSide)
            if (!into) continue
            const need = s.drop ? needOf(s, out.ray.length, into.ray.length) : 1
            if (need < 1) continue
            const length = s.drop ? need : need + share[gi]
            const lengths = cut(length + extra, dirs.length, rand)
            if (!lengths) continue
            const legs = dirs.map((dir, k) => ({ dir, len: lengths[k] }))
            const cells = walkLegs(door, legs)
            const childDoor = step(cells[cells.length - 1], last)
            yield {
              tier: shape === rolled ? 0 : 1,
              line: { door, legs, need: length },
              side: childSide,
              topLeft: [childDoor[0] - into.door[0], childDoor[1] - into.door[1]] as Cell,
            }
          }
        }
    }

    const hangChildren = (key: CellKey): boolean => (children.get(key) ?? []).every(hang)
    const hang = (child: CellKey): boolean => {
      const gi = parentSeg.get(child)!
      const parent = parentOf.get(child)!
      const box = placedBox()
      let tries = 0
      for (const extra of strings[segments[gi].si].drop ? [0] : DETOURS) {
        type Fitting = {
          tier: number
          line: Line
          side: Direction
          topLeft: Cell
          fresh: Hold
          grown: number
          index: number
        }
        const fitting: Fitting[] = []
        for (const cand of candidates(child, extra)) {
          if (--budget < 0) break
          at.set(child, cand.topLeft)
          const fresh: Hold = new Map(legCells(gi, cand.line))
          let clash = false
          for (const [key, holder] of blockCells(child)) {
            if (fresh.has(key)) clash = true
            fresh.set(key, holder)
          }
          at.delete(child)
          if (clash || !fits(hold, fresh)) continue
          fitting.push({ ...cand, fresh, grown: growth(bounds(fresh.keys(), box)), index: fitting.length })
        }
        fitting.sort((x, y) => x.tier - y.tier || x.grown - y.grown || x.index - y.index)
        // Those leaving room for the subtree first, each looked at only when its turn comes.
        const cramped: Fitting[] = []
        const ordered = function* () {
          for (const cand of fitting)
            if (roomFor(child, cand.topLeft, cand.fresh)) yield cand
            else cramped.push(cand)
          yield* cramped
        }
        for (const cand of ordered()) {
          at.set(child, cand.topLeft)
          for (const [key, holder] of cand.fresh) hold.set(key, holder)
          lines.set(gi, cand.line)
          sideOf(parent).add(cand.line.legs[0].dir)
          sides.set(child, new Set([cand.side]))
          if (hangChildren(child)) return true
          for (const [key] of [...subtreeCells(child), ...legCells(gi, cand.line)]) hold.delete(key)
          for (const below of subtree.get(child)!) {
            at.delete(below)
            sides.delete(below)
            lines.delete(parentSeg.get(below)!)
          }
          sideOf(parent).delete(cand.line.legs[0].dir)
          if (spent || budget < 0) break
          if (++tries >= SUBTREE_TRIES) {
            spent = true
            break
          }
        }
        if (spent || budget < 0) break
      }
      if (!spent) failure = `no room for the piece at ${child}`
      return false
    }

    /** Slides each subtree one cell toward its parent while its leg can lose a cell above its drawn length and every
     * cell stays free, in placing order, until none moves. */
    const compact = () => {
      let moved = true
      while (moved) {
        moved = false
        for (const key of order.slice(1)) {
          const gi = parentSeg.get(key)!
          if (strings[segments[gi].si].drop) continue
          for (const dir of SIDES) {
            const line = lines.get(gi)!
            if (line.legs.reduce((sum, leg) => sum + leg.len, 0) <= line.need) break
            const leg = line.legs
              .map((l, i) => (l.dir === dir && l.len > 1 ? i : -1))
              .reduce((a, b) => Math.max(a, b), -1)
            if (leg < 0) continue
            const shift = MOVES[OPPOSITE[dir]]
            const shorter = { ...line, legs: line.legs.map((l, i) => (i === leg ? { ...l, len: l.len - 1 } : l)) }
            const before = [...subtreeCells(key), ...legCells(gi, line)]
            for (const [cellKey] of before) hold.delete(cellKey)
            const fresh: Hold = new Map()
            let clash = false
            for (const [cellKey, holder] of [...subtreeCells(key, shift), ...legCells(gi, shorter)]) {
              if (fresh.has(cellKey)) clash = true
              fresh.set(cellKey, holder)
            }
            if (clash || !fits(hold, fresh)) {
              for (const [cellKey, holder] of before) hold.set(cellKey, holder)
              continue
            }
            for (const [cellKey, holder] of fresh) hold.set(cellKey, holder)
            for (const below of subtree.get(key)!) {
              at.set(below, add(at.get(below)!, shift))
              if (below === key) continue
              const bi = parentSeg.get(below)!
              const l = lines.get(bi)!
              lines.set(bi, { ...l, door: add(l.door, shift) })
            }
            lines.set(gi, shorter)
            moved = true
          }
        }
      }
    }

    at.set(rootKey, [0, 0])
    for (const [key, holder] of blockCells(rootKey)) hold.set(key, holder)
    if (!hangChildren(rootKey)) continue
    compact()

    const legEnds = (gi: number) => {
      const { door, legs } = lines.get(gi)!
      const cells = walkLegs(door, legs)
      return { from: door, cells, to: step(cells[cells.length - 1], legs[legs.length - 1].dir) }
    }
    const nodeAt = (node: CellKey) => add(at.get(blockOf.get(node)!)!, blocks.get(blockOf.get(node)!)!.nodes.get(node)!)
    const pieceAt = new Map<CellKey, Cell>()
    for (const [key, unit] of blocks)
      for (const [piece, offset] of unit.pieces)
        if (graph.pieces.has(piece)) pieceAt.set(piece, add(at.get(key)!, offset))
    return {
      graph,
      blocks: pieceAt,
      strings: strings.map((s, si) => {
        if (held.has(si)) {
          const unit = blocks.get(blockOf.get(s.a)!)!
          const { corners: inner, stops } = unit.inside.get(si)!
          const shift = at.get(unit.key)!
          return { corners: inner.map(cell => add(cell, shift)), stops: stops.map(cell => add(cell, shift)) }
        }
        const chain = [s.a, ...s.nodes, s.b]
        const cells: Cell[] = []
        let doorA: Cell = [0, 0]
        let doorB: Cell = [0, 0]
        for (let j = 0; j + 1 < chain.length; j++) {
          const [here, next] = [blockOf.get(chain[j])!, blockOf.get(chain[j + 1])!]
          const forward = parentOf.get(next) === here
          const gi = parentSeg.get(forward ? next : here)!
          const leg = legEnds(gi)
          const run = forward ? leg.cells : [...leg.cells].reverse()
          if (j === 0) doorA = forward ? leg.from : leg.to
          if (j === chain.length - 2) doorB = forward ? leg.to : leg.from
          if (j > 0) cells.push(nodeAt(chain[j]))
          cells.push(...run)
        }
        return { corners: cornersOf(doorA, cells, doorB), stops: s.nodes.map(nodeAt) }
      }),
      attempts: attempt + 1,
    }
  }
  return { refused: failure }
}
