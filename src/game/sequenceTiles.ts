import { hashString } from "@/support/hashString"
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
}

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const OPPOSITE: Record<Direction, Direction> = { n: "s", s: "n", e: "w", w: "e" }

const standable = (cell: GridCell | undefined): boolean =>
  (cell?.type === "room" || cell?.type === "corridor") && !cell.hidden && !isObstacleCell(cell)

// WHETHER ANY WALK GOES ROUND A CELL: the ground either side of it, joined without it, doors open and drops
// taken as the one-way moves they are. A tile on a cell nothing goes round is a tile every way through its
// stretch crosses, which is what makes stepping on it unavoidable.
const walkGraphOf = (
  grid: FloorGrid
): {
  isCut: (r: number, c: number) => boolean
  reachedFrom: (from: string, without: string[]) => Set<string>
  neighbours: (key: string) => string[]
} => {
  const ahead = new Map<string, string[]>()
  for (const { launch, landing } of oneWayRuns(grid)) {
    const from = `${launch[0]},${launch[1]}`
    ahead.set(from, [...(ahead.get(from) ?? []), `${landing[0]},${landing[1]}`])
  }
  const neighbours = (key: string): string[] => {
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
  const reachedFrom = (from: string, without: string[]): Set<string> => {
    const seen = new Set([from, ...without])
    const queue = [from]
    for (let at = 0; at < queue.length; at++)
      for (const next of neighbours(queue[at])) {
        if (seen.has(next)) continue
        seen.add(next)
        queue.push(next)
      }
    for (const key of without) seen.delete(key)
    return seen
  }
  return {
    isCut: (r, c) => {
      const cell = grid.cells[r][c]
      if (cell.type !== "corridor" || cell.dirs.size !== 2) return false
      const [a, b] = [...cell.dirs].map(dir => `${r + MOVES[dir][0]},${c + MOVES[dir][1]}`)
      const own = `${r},${c}`
      return !reachedFrom(a, [own]).has(b) && !reachedFrom(b, [own]).has(a)
    },
    reachedFrom,
    neighbours,
  }
}

// A tile stands on a bare corridor node of its region that nothing walks round: ground the player walks onto,
// with nothing else on it. Nodes only (even/even), since a connector between two nodes is not somewhere a
// walk stops.
export const isCandidate = (cell: GridCell, r: number, c: number, region: string): boolean =>
  cell.type === "corridor" &&
  cell.region === region &&
  !cell.hidden &&
  !cell.obstacle &&
  cell.dirs.size <= 2 &&
  r % 2 === 0 &&
  c % 2 === 0

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
  region: cell.region,
  ...piece,
})

/**
 * STANDS EVERY SEQUENCE'S TILES ON THE FINISHED CARVE, and changes no wall: a tile is a corridor node
 * becoming a room, `dirs` untouched. Each step takes its own cell in the region the author named, so two
 * steps in one region are two cells, and nothing is placed anywhere else — a region with no free cut node
 * (one no walk goes round) for a step refuses the whole placement, naming the sequence and the step.
 *
 * The sequence's one record goes on the tile of step 0; the door named by `doorKey` works the reset.
 *
 * `reserved` are cells a tile may never take: a switch's way out is a corridor node whether or not a switch ends
 * up shutting it, and a tile there would be placed on a carve that differs by whether a mod filled the junction.
 */
export const placeSequences = (
  cells: GridCell[][],
  grid: FloorGrid,
  sequences: readonly SequenceDemand[],
  salt: string,
  reserved: ReadonlySet<string> = new Set()
): { id: string; step: number } | undefined => {
  const { isCut, reachedFrom, neighbours } = walkGraphOf(grid)
  const entrance = `${grid.entrancePos[0]},${grid.entrancePos[1]}`
  const taken = new Set<string>()
  const picked = new Map<string, Place[]>()
  for (const { id, regions, doorKey } of sequences) {
    // The walk starts at the entrance and starts over beside the door, from the side the entrance reaches
    // with the door shut; a tile that cuts either start off from an earlier tile is out of its turn.
    const doorCell = cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "room" && cell.requiredKeyId === doorKey ? [`${r},${c}`] : []))
    )[0]
    const beside = doorCell ? neighbours(doorCell).filter(n => reachedFrom(entrance, [doorCell]).has(n)) : []
    const starts = [entrance, ...beside]
    const places: Place[] = []
    for (const [step, region] of regions.entries()) {
      const candidates: Place[] = []
      for (let r = 0; r < cells.length; r++)
        for (let c = 0; c < cells[r].length; c++)
          if (
            !taken.has(`${r},${c}`) &&
            !reserved.has(`${r},${c}`) &&
            isCandidate(cells[r][c], r, c, region) &&
            isCut(r, c)
          )
            candidates.push([r, c])
      const rank = ([r, c]: Place) => hashString(`${salt}|sequence|${id}|${step}|${r},${c}`)
      // A cell that shuts the way from a start to a tile already stood would make that tile's turn
      // unreachable before this one, so such cells come last.
      const shuts = ([r, c]: Place) =>
        starts.filter(start => {
          const reached = reachedFrom(start, [`${r},${c}`])
          return places.some(([pr, pc]) => !reached.has(`${pr},${pc}`))
        }).length
      const [next] = candidates
        .map(place => ({ place, shuts: shuts(place) }))
        .sort((x, y) => x.shuts - y.shuts || rank(x.place) - rank(y.place))
      if (!next) return { id, step }
      taken.add(`${next.place[0]},${next.place[1]}`)
      places.push(next.place)
    }
    picked.set(id, places)
  }

  for (const { id, glyphs, gates, doorKey } of sequences) {
    const tiles = picked.get(id)!
    const doors = cells.flatMap((row, r) =>
      row.flatMap((cell, c): Place[] => (cell.type === "room" && cell.requiredKeyId === doorKey ? [[r, c]] : []))
    )
    if (doors.length !== 1) throw new Error(`[siteAssembler] sequence ${id} resets at ${doors.length} doors, not one`)
    const [door] = doors
    const record = compileSequence({ tiles, door, gates })
    const transitionAt = ([r, c]: Place) => record.transitions!.findIndex(t => t.at[0] === r && t.at[1] === c)
    tiles.forEach(([r, c], step) => {
      const cell = cells[r][c]
      if (cell.type !== "corridor") throw new Error(`[siteAssembler] sequence ${id} tile ${step} is not on a corridor`)
      const tile = standOnCorridor(cell, {
        sequenceTile: { id, step, glyph: glyphs[step] },
        worksMechanism: { mechanismId: id, transition: transitionAt([r, c]) },
        ...(step === 0 ? { mechanism: record, mechanismId: id } : {}),
      })
      cells[r][c] = tile
    })
    const doorCell = cells[door[0]][door[1]]
    if (doorCell.type === "room")
      cells[door[0]][door[1]] = { ...doorCell, worksMechanism: { mechanismId: id, transition: transitionAt(door) } }
  }
  return undefined
}
