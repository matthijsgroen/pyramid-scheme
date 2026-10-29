import { oneWayRuns } from "../../gridNavigation"
import { mulberry32 } from "../../random"
import { claimsFloorAt } from "../../roomFootprint"
import type { CellRect, CorridorCell, Direction, FloorGrid, GridCell } from "../../siteTypes"
import { NODE_STEP, OPPOSITE } from "../grid"
import { MAIN_SECTION_ADDRESS } from "../sections"
import type { Cell } from "../state"
import { layBlocks, type BlockDrop, type BlockNode, type Blocks } from "./blocks"
import { routeBand } from "./route"

/** A lattice node, "r,c" on the sketch. */
export type CellKey = string

/** A designed room's footprint, ring included: its size, its node's cell and the door place each way out leaves by,
 * every offset from the footprint's top-left (`seatOf`). */
export type EmbedRoom = { rows: number; cols: number; node: Cell; doors: Partial<Record<Direction, Cell>> }

export type EmbedOptions = {
  seed: number
  spread: number
  straightness: number
  /** The designed rooms by sketch node. */
  rooms: ReadonlyMap<CellKey, EmbedRoom>
}

export type EmbedReport = { rows: number; cols: number; longestRoomToRoom: number }

export type Embedded = {
  grid: FloorGrid
  /** Each designed room's inside of the ring, by sketch node, as `stampPrefab` takes it. */
  prefabRects: Map<CellKey, CellRect>
  /** Where each sketch node stands on the floor. */
  nodes: Map<CellKey, Cell>
  report: EmbedReport
}

const EMBED_SALT = 0x5bd1e995
const MOVES: Record<Direction, Cell> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const keyOf = ([r, c]: readonly [number, number]): CellKey => `${r},${c}`
const step = ([r, c]: Cell, dir: Direction, k = 1): Cell => [r + MOVES[dir][0] * k, c + MOVES[dir][1] * k]
const dirBetween = ([r, c]: Cell, [nr, nc]: Cell): Direction => (nr < r ? "n" : nr > r ? "s" : nc > c ? "e" : "w")

type Edge = { a: CellKey; b: CellKey; dir: "e" | "s"; connector: CorridorCell }
type Drop = BlockDrop & { launch: CorridorCell; run: CorridorCell[]; landing: CorridorCell }

const asCorridor = (cell: GridCell, at: Cell): CorridorCell => {
  if (cell.type !== "corridor") throw new Error(`[carve] the sketch's connector at ${keyOf(at)} is not a corridor`)
  return cell
}

/** The sketch read as nodes (every even/even cell but a drop's), the edges between them, each once from its north or
 * west end, and its drops. */
const readSketch = (lattice: FloorGrid) => {
  const runs = oneWayRuns(lattice)
  const dropCells = new Set(runs.flatMap(run => [run.launch, ...run.cells, run.landing].map(keyOf)))
  const nodes: CellKey[] = []
  lattice.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (r % NODE_STEP || c % NODE_STEP || cell.type === "empty" || dropCells.has(keyOf([r, c]))) return
      nodes.push(keyOf([r, c]))
    })
  )
  const isNode = new Set(nodes)
  const cellOf = ([r, c]: Cell) => lattice.cells[r][c]
  const edges: Edge[] = nodes.flatMap(a => {
    const at = a.split(",").map(Number) as Cell
    const node = cellOf(at)
    if (node.type === "empty") return []
    return (["e", "s"] as const).flatMap((dir): Edge[] => {
      const connector = step(at, dir)
      if (!node.dirs.has(dir) || dropCells.has(keyOf(connector))) return []
      const b = keyOf(step(at, dir, NODE_STEP))
      if (!isNode.has(b)) throw new Error(`[carve] the sketch's way ${dir} of ${a} reaches no node`)
      return [{ a, b, dir, connector: asCorridor(cellOf(connector), connector) }]
    })
  })
  const drops: Drop[] = runs.map(run => {
    const from = keyOf(step(run.launch, OPPOSITE[run.dir]))
    const to = keyOf(step(run.landing, run.dir))
    if (!isNode.has(from) || !isNode.has(to)) throw new Error(`[carve] the drop at ${keyOf(run.launch)} joins no node`)
    return {
      from,
      to,
      dir: run.dir,
      reach: run.cells.length + 3,
      launch: asCorridor(cellOf(run.launch), run.launch),
      run: run.cells.map(cell => asCorridor(cellOf(cell), cell)),
      landing: asCorridor(cellOf(run.landing), run.landing),
    }
  })
  return { nodes, edges, drops }
}

/** Each node's footprint: a designed room's own, a room that claims floor 3×3 round its node, anything else its one
 * cell. A stop on the main path running straight through keeps to its block's middle line across its way, so a run
 * of stops stays one straight corridor; a drop's ends sit flush toward each other and on one middle line. */
const blockNodes = (lattice: FloorGrid, nodes: readonly CellKey[], drops: readonly Drop[], opts: EmbedOptions) =>
  nodes.map((key): BlockNode => {
    const [r, c] = key.split(",").map(Number)
    const cell = lattice.cells[r][c]
    const room = opts.rooms.get(key)
    const size = room ?? (claimsFloorAt(lattice, r, c) ? { rows: 3, cols: 3, node: [1, 1] as Cell } : undefined)
    const hold: BlockNode["hold"] = { row: "free", col: "free" }
    const dirs = cell.type === "empty" ? new Set<Direction>() : cell.dirs
    const straight = dirs.size === 2 && ((dirs.has("e") && dirs.has("w")) || (dirs.has("n") && dirs.has("s")))
    if (!size && straight && cell.type !== "empty" && cell.sectionAddress === MAIN_SECTION_ADDRESS)
      hold[dirs.has("e") ? "row" : "col"] = "middle"
    for (const drop of drops) {
      if (drop.from !== key && drop.to !== key) continue
      if (room) throw new Error(`[carve] a drop leaves the designed room at ${key}`)
      const vertical = drop.dir === "n" || drop.dir === "s"
      const forward = drop.dir === "s" || drop.dir === "e"
      hold[vertical ? "row" : "col"] = (drop.from === key) === forward ? "far" : "near"
      hold[vertical ? "col" : "row"] = "middle"
    }
    return { key, r, c, rows: size?.rows ?? 1, cols: size?.cols ?? 1, node: size?.node ?? [0, 0], hold }
  })

/** The cells a way out crosses inside its own footprint, after the node: to a designed room's door place, over a
 * claiming room's ring, none from a one-cell node. */
const rayOut = (node: BlockNode, blocks: Blocks, room: EmbedRoom | undefined, dir: Direction): Cell[] => {
  const at = blocks.at.get(node.key)!
  if (!room) return node.rows === 3 ? [step(at, dir)] : []
  const door = room.doors[dir]
  const [top, left] = blocks.origin.get(node.key)!
  const [dr, dc] = door ? [top + door[0], left + door[1]] : [-1, -1]
  const length = Math.abs(dr - at[0]) + Math.abs(dc - at[1])
  if (!door || keyOf(step(at, dir, length)) !== keyOf([dr, dc]))
    throw new Error(`[carve] the room at ${node.key} has no door place ${dir} in line with its node`)
  return Array.from({ length }, (_, k) => step(at, dir, k + 1))
}

/** The rooms' longest walk from one room to the next over corridor alone. */
const longestRoomToRoom = (grid: FloorGrid): number => {
  let longest = 0
  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type !== "room") return
      const seen = new Set([keyOf([r, c])])
      let frontier: Cell[] = [[r, c]]
      for (let d = 1; frontier.length; d++) {
        const next: Cell[] = []
        for (const at of frontier) {
          const here = grid.cells[at[0]][at[1]]
          if (here.type === "empty" || (here.type === "room" && d > 1)) continue
          for (const dir of here.dirs) {
            const to = step(at, dir)
            if (seen.has(keyOf(to))) continue
            seen.add(keyOf(to))
            if (grid.cells[to[0]][to[1]].type === "room") longest = Math.max(longest, d)
            next.push(to)
          }
        }
        frontier = next
      }
    })
  )
  return longest
}

/**
 * THE SKETCH GIVEN REAL SPACE. Every node of the lattice claims its footprint in its row and column block
 * (`layBlocks`); every edge is a corridor inside its own band, leaving each footprint on the side facing the other
 * node and, for a designed room, through the door place its seat names (`routeBand`); every drop runs straight, its
 * run exact, any length its ends stand apart beyond their reach walked as plain corridor before the launch. Each
 * node's cell is copied whole with `dirs` recomputed from the corridors, and each corridor cell takes its connector's
 * labels. Draws come from the embed's own stream, so the passes' draws are untouched.
 */
export const embedFloor = (lattice: FloorGrid, opts: EmbedOptions): Embedded => {
  const rand = mulberry32(opts.seed ^ EMBED_SALT)
  const { nodes, edges, drops } = readSketch(lattice)
  const footprints = blockNodes(lattice, nodes, drops, opts)
  const byKey = new Map(footprints.map(node => [node.key, node]))
  const blocks = layBlocks(footprints, drops, opts.spread, rand)
  const at = (key: CellKey) => blocks.at.get(key)!

  const cells: GridCell[][] = Array.from({ length: blocks.rows }, () =>
    Array.from({ length: blocks.cols }, (): GridCell => ({ type: "empty" }))
  )
  const dirs = new Map<CellKey, Set<Direction>>()
  const link = (from: Cell, to: Cell) => {
    const dir = dirBetween(from, to)
    for (const [cell, way] of [
      [from, dir],
      [to, OPPOSITE[dir]],
    ] as const) {
      const own = dirs.get(keyOf(cell)) ?? new Set<Direction>()
      own.add(way)
      dirs.set(keyOf(cell), own)
    }
  }
  const put = ([r, c]: Cell, cell: GridCell) => {
    if (cells[r][c].type !== "empty") throw new Error(`[carve] the embed laid two things at ${keyOf([r, c])}`)
    cells[r][c] = cell
  }
  for (const key of nodes) {
    const [r, c] = key.split(",").map(Number)
    put(at(key), lattice.cells[r][c])
  }

  for (const { a, b, dir, connector } of edges) {
    const back = OPPOSITE[dir]
    const fromRay = rayOut(byKey.get(a)!, blocks, opts.rooms.get(a), dir)
    const toRay = rayOut(byKey.get(b)!, blocks, opts.rooms.get(b), back)
    const gaps = dir === "e" ? blocks.colGaps : blocks.rowGaps
    const gap = gaps.get(dir === "e" ? byKey.get(a)!.c : byKey.get(a)!.r)!
    const from = fromRay[fromRay.length - 1] ?? at(a)
    const to = toRay[toRay.length - 1] ?? at(b)
    const band = routeBand(from, to, dir, gap, opts.straightness, rand)
    const between = [...fromRay, ...band, ...[...toRay].reverse()]
    for (const cell of between) put(cell, connector)
    const path = [at(a), ...between, at(b)]
    for (let i = 1; i < path.length; i++) link(path[i - 1], path[i])
  }

  for (const drop of drops) {
    const [from, to] = [at(drop.from), at(drop.to)]
    const span = Math.abs(to[0] - from[0]) + Math.abs(to[1] - from[1])
    if (keyOf(step(from, drop.dir, span)) !== keyOf(to))
      throw new Error(`[carve] the drop from ${drop.from} does not line up with ${drop.to}`)
    const pad = span - drop.reach
    const along = [...Array.from({ length: pad }, () => drop.launch), drop.launch, ...drop.run, drop.landing]
    const path = [from, ...along.map((_, k) => step(from, drop.dir, k + 1)), to]
    along.forEach((cell, k) => put(path[k + 1], cell))
    const onRun = (k: number) => k > pad + 1 && k <= pad + 1 + drop.run.length
    for (let k = 1; k < path.length; k++) if (!onRun(k - 1) && !onRun(k)) link(path[k - 1], path[k])
  }

  const grid: FloorGrid = {
    ...lattice,
    rows: blocks.rows,
    cols: blocks.cols,
    cells: cells.map((row, r) =>
      row.map((cell, c) => (cell.type === "empty" ? cell : { ...cell, dirs: dirs.get(keyOf([r, c])) ?? new Set() }))
    ),
    entrancePos: placed(blocks, lattice.entrancePos),
    exitPos: placed(blocks, lattice.exitPos),
    staircases: Object.fromEntries(
      Object.entries(lattice.staircases).map(([id, stair]) => [id, placed(blocks, stair)])
    ),
  }
  const prefabRects = new Map<CellKey, CellRect>()
  for (const [key, room] of opts.rooms) {
    const origin = blocks.origin.get(key)
    if (!origin) throw new Error(`[carve] a designed room is named for ${key}, where the sketch has no node`)
    prefabRects.set(key, { top: origin[0] + 1, left: origin[1] + 1, rows: room.rows - 2, cols: room.cols - 2 })
  }
  return {
    grid,
    prefabRects,
    nodes: new Map(nodes.map(key => [key, at(key)])),
    report: { rows: grid.rows, cols: grid.cols, longestRoomToRoom: longestRoomToRoom(grid) },
  }
}

const placed = (blocks: Blocks, pos: readonly [number, number]): [number, number] => {
  const cell = blocks.at.get(keyOf(pos))
  if (!cell) throw new Error(`[carve] ${keyOf(pos)} is named on the sketch but is no node`)
  return cell
}
