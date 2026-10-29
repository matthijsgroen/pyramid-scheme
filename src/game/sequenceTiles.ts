import { compileSequence } from "./sequence"
import { isObstacleCell, oneWayRuns } from "./gridNavigation"
import type { Direction, FloorGrid, GridCell, RoomCell } from "./siteTypes"

type Place = [number, number]

/** One sequence to stand on the floor: where each step's tile belongs, the glyph each wears, what finishing
 * opens, and the key of the door it is reset at. */
export type SequenceDemand = {
  id: string
  regions: readonly string[]
  glyphs: readonly number[]
  gates: readonly { gateKeyId: string; mode?: "any" }[]
  doorKey: string
  /** The realisation that reads the order at the door instead of showing it (a procession door). */
  orderReader?: string
  /** Which entry of its board's seed list the door deals (src/game/seeds/boardIndex.ts), where it carries one. */
  boardIndex?: number
}

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

const standable = (cell: GridCell | undefined): boolean =>
  (cell?.type === "room" || cell?.type === "corridor") && !cell.hidden && !isObstacleCell(cell)

// THE WALK OVER THE FLOOR: the ground beside each cell, doors open and drops taken as the one-way moves they are.
const neighboursOf = (grid: FloorGrid): ((key: string) => string[]) => {
  const ahead = new Map<string, string[]>()
  for (const { launch, landing } of oneWayRuns(grid)) {
    const from = `${launch[0]},${launch[1]}`
    ahead.set(from, [...(ahead.get(from) ?? []), `${landing[0]},${landing[1]}`])
  }
  return key => {
    const [r, c] = key.split(",").map(Number)
    const cell = grid.cells[r]?.[c]
    if (!standable(cell) || (cell?.type !== "room" && cell?.type !== "corridor")) return []
    const found = [...(ahead.get(key) ?? [])]
    for (const dir of cell.dirs) {
      const [nr, nc] = [r + MOVES[dir][0], c + MOVES[dir][1]]
      const next = grid.cells[nr]?.[nc]
      if (standable(next) && (next?.type === "room" || next?.type === "corridor") && next.dirs.has(OPPOSITE[dir]))
        found.push(`${nr},${nc}`)
    }
    return found
  }
}

const regionAt = (grid: FloorGrid, key: string): string | undefined => {
  const [r, c] = key.split(",").map(Number)
  const cell = grid.cells[r]?.[c]
  return standable(cell) && (cell?.type === "room" || cell?.type === "corridor") ? cell.region : undefined
}

/**
 * THE THRESHOLDS OF A ROOM: for every way into `region`, the first free node of the region the way runs onto, so
 * entering the region from any side steps on one of them. A way in is a move from ground outside the region onto
 * ground inside it, drops included; the floor's entrance counts as outside, so a player who starts in the region
 * steps on a threshold as they set off. From where a way crosses in, the threshold is looked for along the
 * corridor running on into the region, up to the first room or fork; a door on that corridor, or a cell kept from
 * tiles (`free` refuses it), is passed over. Each threshold is named by the region its
 * way comes from (`start` for the entrance), told apart by a count when two ways come from one region.
 */
const thresholdsOf = (
  grid: FloorGrid,
  cells: GridCell[][],
  neighbours: (key: string) => string[],
  region: string,
  free: (key: string) => boolean,
  isNode: IsNode
): { places: { at: Place; entrance: string }[] } | { reason: string } => {
  const entrance = `${grid.entrancePos[0]},${grid.entrancePos[1]}`
  const inside = (key: string) => key !== entrance && regionAt(grid, key) === region
  const ways: { from: string; to: string }[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const from = `${r},${c}`
      if (inside(from)) continue
      for (const to of neighbours(from)) if (inside(to)) ways.push({ from, to })
    }
  if (ways.length === 0) return { reason: `${region} has no way in` }

  const picked = new Map<string, string>()
  // The ground of the region between where a way crosses in and its threshold: corridor, doors and kept cells.
  const porch = new Set<string>()
  const named = new Map<string, number>()
  for (const { from, to } of ways) {
    const comesFrom = from === entrance ? "start" : (regionAt(grid, from) ?? "outside")
    let [prev, at] = [from, to]
    let found: string | undefined
    for (let hops = 0; hops < grid.rows * grid.cols && !found; hops++) {
      const [r, c] = at.split(",").map(Number)
      if (free(at) && isCandidate(cells[r][c], r, c, region, isNode)) {
        found = at
        break
      }
      const cell = grid.cells[r][c]
      const onward = neighbours(at).filter(next => next !== prev && inside(next))
      const door = cell.type === "room" && (cell.requiredKeyId !== undefined || (cell.requiredKeyIds ?? []).length > 0)
      if ((cell.type !== "corridor" && !door && free(at)) || onward.length !== 1) break
      porch.add(at)
      ;[prev, at] = [at, onward[0]]
    }
    if (!found) return { reason: `no free node of ${region} stands on its way in from ${comesFrom}` }
    if (picked.has(found)) continue
    const count = named.get(comesFrom) ?? 0
    named.set(comesFrom, count + 1)
    picked.set(found, count === 0 ? comesFrom : `${comesFrom}.${count}`)
  }

  // Every way in has its threshold; what is left to prove is that no ground reaches the region round them.
  const seen = new Set<string>(picked.keys())
  const queue = grid.cells.flatMap((row, r) =>
    row.flatMap((_, c) => (inside(`${r},${c}`) || !standable(grid.cells[r][c]) ? [] : [`${r},${c}`]))
  )
  for (const key of queue) seen.add(key)
  for (let at = 0; at < queue.length; at++)
    for (const next of neighbours(queue[at])) {
      if (seen.has(next)) continue
      if (inside(next) && !porch.has(next)) return { reason: `a way into ${region} goes round its thresholds` }
      seen.add(next)
      queue.push(next)
    }
  return {
    places: [...picked].map(([key, name]) => ({ at: key.split(",").map(Number) as Place, entrance: name })),
  }
}

/** Whether r,c is one of the floor's nodes, where a walk stops, rather than corridor between two of them. */
export type IsNode = (r: number, c: number) => boolean

/** The nodes of a floor carved on the lattice: every even/even cell. */
export const latticeNode: IsNode = (r, c) => r % 2 === 0 && c % 2 === 0

// A tile stands on a bare corridor node of its region: ground the player walks onto,
// with nothing else on it. Nodes only, since a connector between two nodes is not somewhere a walk stops.
export const isCandidate = (cell: GridCell, r: number, c: number, region: string, isNode: IsNode): boolean =>
  cell.type === "corridor" &&
  cell.region === region &&
  !cell.hidden &&
  !cell.obstacle &&
  cell.dirs.size <= 2 &&
  isNode(r, c)

/** The encounter room a corridor node becomes when a mechanism's piece stands on it: `dirs` and the section's
 * identity carried over, so no wall moves, plus the piece's own fields. */
export const standOnCorridor = (cell: Extract<GridCell, { type: "corridor" }>, piece: Partial<RoomCell>): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: cell.dirs,
  state: cell.state,
  sectionAddress: cell.sectionAddress,
  sectionHash: cell.sectionHash,
  legacySectionHash: cell.legacySectionHash,
  ordinal: cell.ordinal,
  difficulty: cell.difficulty,
  ...(cell.tileset ? { tileset: cell.tileset } : {}),
  region: cell.region,
  ...piece,
})

/**
 * STANDS EVERY SEQUENCE'S TILES ON THE FINISHED CARVE, and changes no wall: a tile is a corridor node
 * becoming a room, `dirs` untouched. A step lives in the region the author named, and its tile stands on every
 * way into that region (`thresholdsOf`), each the same step wearing the same glyph, so entering the region from
 * any side steps on it. A region two steps of one sequence name would press both on one crossing, and a region
 * without a free threshold on some way in refuses the whole placement, naming the sequence, the step and why.
 *
 * The sequence's one record goes on the first tile of step 0; the door named by `doorKey` works the reset.
 *
 * `reserved` are cells a tile may never take: a switch's way out is a corridor node whether or not a switch ends
 * up shutting it, and a tile there would be placed on a carve that differs by whether a mod filled the junction.
 */
export const placeSequences = (
  cells: GridCell[][],
  grid: FloorGrid,
  sequences: readonly SequenceDemand[],
  reserved: ReadonlySet<string> = new Set(),
  isNode: IsNode = latticeNode
): { id: string; step: number; reason: string } | undefined => {
  const neighbours = neighboursOf(grid)
  const taken = new Set<string>()
  const picked = new Map<string, { at: Place; entrance: string }[][]>()
  for (const { id, regions } of sequences) {
    const steps: { at: Place; entrance: string }[][] = []
    for (const [step, region] of regions.entries()) {
      const earlier = regions.indexOf(region)
      if (earlier < step) return { id, step, reason: `${region} holds step ${earlier} too` }
      const found = thresholdsOf(grid, cells, neighbours, region, key => !taken.has(key) && !reserved.has(key), isNode)
      if ("reason" in found) return { id, step, reason: found.reason }
      for (const { at } of found.places) taken.add(`${at[0]},${at[1]}`)
      steps.push(found.places)
    }
    picked.set(id, steps)
  }

  for (const { id, glyphs, gates, doorKey, orderReader, boardIndex } of sequences) {
    const steps = picked.get(id)!
    const doors = cells.flatMap((row, r) =>
      row.flatMap((cell, c): Place[] => (cell.type === "room" && cell.requiredKeyId === doorKey ? [[r, c]] : []))
    )
    if (doors.length !== 1) throw new Error(`[siteAssembler] sequence ${id} resets at ${doors.length} doors, not one`)
    const [door] = doors
    const record = compileSequence({ tiles: steps.map(places => places.map(({ at }) => at)), door, gates, orderReader })
    const transitionAt = ([r, c]: Place) => record.transitions!.findIndex(t => t.at[0] === r && t.at[1] === c)
    steps.forEach((places, step) =>
      places.forEach(({ at: [r, c], entrance }, way) => {
        const cell = cells[r][c]
        if (cell.type !== "corridor")
          throw new Error(`[siteAssembler] sequence ${id} tile ${step} is not on a corridor`)
        cells[r][c] = standOnCorridor(cell, {
          sequenceTile: { id, step, glyph: glyphs[step], entrance },
          worksMechanism: { mechanismId: id, transition: transitionAt([r, c]) },
          ...(step === 0 && way === 0 ? { mechanism: record, mechanismId: id } : {}),
        })
      })
    )
    const doorCell = cells[door[0]][door[1]]
    if (doorCell.type === "room")
      cells[door[0]][door[1]] = {
        ...doorCell,
        worksMechanism: { mechanismId: id, transition: transitionAt(door) },
        ...(boardIndex === undefined ? {} : { boardIndex }),
      }
  }
  return undefined
}
