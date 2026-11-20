import { hashString } from "@/support/hashString"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell } from "../siteTypes"
import type { FloorPrep } from "./state"

const STEP: Record<Direction, readonly [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** A bare run must be longer than this, in cells, before a puzzle stands in it. */
export const BARE_RUN_CELLS = 5

/** The board address a corridor puzzle is dealt its board under: it stands on no chain, so it is named by its place
 * in the floor's corridor puzzles. */
export const corridorPuzzleAddress = (k: number) => ({ section: "corridor", pathIndex: k })

/** The encounter corridor puzzle `k` was dealt, else the floor's own. */
export const corridorEncounter = (
  floor: Pick<FloorConfig, "corridorEncounters" | "encounter">,
  k: number
): string | string[] | undefined => floor.corridorEncounters?.[k] ?? floor.encounter

type Cells = ReadonlyArray<ReadonlyArray<GridCell>>

// A corridor cell a walk passes straight through with nothing on it, beside it or under it.
const bare = (cells: Cells, marked: ReadonlySet<string>, r: number, c: number): boolean => {
  const cell = cells[r]?.[c]
  if (cell?.type !== "corridor" || cell.dirs.size !== 2 || marked.has(`${r},${c}`)) return false
  if (cell.obstacle || cell.openGate || cell.prefabRoom || cell.hidden) return false
  return Object.values(STEP).every(([dr, dc]) => {
    const near = cells[r + dr]?.[c + dc]
    return near?.type !== "corridor" || near.obstacle === undefined
  })
}

/** Every maximal run of bare cells, each in walk order from one end; a run closed on itself has no end and is left. */
export const bareRuns = (grid: FloorGrid): Array<Array<[number, number]>> => {
  const marked = new Set(
    [grid.entrancePos, grid.exitPos, ...Object.values(grid.staircases)].map(([r, c]) => `${r},${c}`)
  )
  const isBare = (r: number, c: number) => bare(grid.cells, marked, r, c)
  const onward = (r: number, c: number, from?: string): [number, number] | undefined => {
    const cell = grid.cells[r][c] as Extract<GridCell, { type: "corridor" }>
    for (const dir of cell.dirs) {
      const [nr, nc] = [r + STEP[dir][0], c + STEP[dir][1]]
      if (`${nr},${nc}` !== from && isBare(nr, nc)) return [nr, nc]
    }
    return undefined
  }
  const seen = new Set<string>()
  const runs: Array<Array<[number, number]>> = []
  grid.cells.forEach((row, r) =>
    row.forEach((_, c) => {
      if (seen.has(`${r},${c}`) || !isBare(r, c)) return
      // An end is a bare cell with at most one bare neighbour along its ways.
      const ways = [...(grid.cells[r][c] as Extract<GridCell, { type: "corridor" }>).dirs].filter(dir =>
        isBare(r + STEP[dir][0], c + STEP[dir][1])
      )
      if (ways.length > 1) return
      const run: Array<[number, number]> = []
      for (let at: [number, number] | undefined = [r, c], from: string | undefined; at;) {
        run.push(at)
        seen.add(`${at[0]},${at[1]}`)
        const next = onward(at[0], at[1], from)
        from = `${at[0]},${at[1]}`
        at = next && !seen.has(`${next[0]},${next[1]}`) ? next : undefined
      }
      runs.push(run)
    })
  )
  return runs
}

/**
 * A LONG BARE CORRIDOR TAKES A PUZZLE, WITHOUT LOOT: up to `wanted` of them, each on the node nearest the middle of
 * the longest bare run longer than `BARE_RUN_CELLS` cells, which the puzzle splits in two for the next. In seat
 * order; fewer where the floor has fewer runs. Ties break by hash.
 */
export const corridorPuzzleSpots = (grid: FloorGrid, wanted: number, siteId: string): Array<[number, number]> => {
  const [er, ec] = grid.entrancePos
  const isNode = ([r, c]: [number, number]) => (r - er) % 2 === 0 && (c - ec) % 2 === 0
  const rank = (run: Array<[number, number]>) => hashString(`${siteId}|corridorPuzzle|${run[0].join(",")}`)
  const spots: Array<[number, number]> = []
  let runs = bareRuns(grid)
  while (spots.length < wanted) {
    runs = runs.filter(run => run.length > BARE_RUN_CELLS)
    const run = runs.sort((a, b) => b.length - a.length || rank(a) - rank(b))[0]
    if (run === undefined) break
    const middle = (run.length - 1) / 2
    const at = run
      .map((cell, i) => ({ cell, i }))
      .filter(({ cell }) => isNode(cell))
      .sort((a, b) => Math.abs(a.i - middle) - Math.abs(b.i - middle) || a.i - b.i)[0]
    runs = runs.filter(other => other !== run)
    if (at === undefined) continue
    runs.push(run.slice(0, at.i), run.slice(at.i + 1))
    spots.push(at.cell)
  }
  return spots
}

/**
 * The floor's corridor puzzles (`corridorPuzzleSpots`) stood on the finished carve: each turns its corridor cell into
 * a puzzle room, so no wall, `dirs` or other room moves. An intent, as `chambers` is: never refuses the floor.
 */
export const seatCorridorPuzzles = (prep: FloorPrep, grid: FloorGrid): FloorGrid => {
  const { config } = prep.config
  const wanted = config.corridorPuzzles ?? 0
  if (wanted === 0) return grid
  const { siteId, resolveEncounter, resolveBoardIndex } = prep.input
  const cells = grid.cells.map(row => [...row])
  corridorPuzzleSpots(grid, wanted, siteId).forEach(([r, c], k) => {
    const family = resolveEncounter(corridorEncounter(config, k), "puzzle")
    const corridor = cells[r][c] as Extract<GridCell, { type: "corridor" }>
    const boardIndex = resolveBoardIndex?.(family.familyId, corridorPuzzleAddress(k))
    const room: RoomCell = {
      ...corridor,
      type: "room",
      roomType: "encounter",
      family: family.familyId,
      tags: family.tags,
      corridorPuzzle: k,
      // The floor's tier, which its board was dealt under (buildBoardIndexes).
      difficulty: config.difficulty,
      ...(boardIndex !== undefined ? { boardIndex } : {}),
      ...(config.theme !== undefined ? { theme: config.theme } : {}),
      ...(config.condition !== undefined ? { condition: config.condition } : {}),
      ...(config.patron !== undefined ? { patron: config.patron } : {}),
      ...(config.role !== undefined ? { role: config.role } : {}),
    }
    cells[r][c] = room
  })
  return { ...grid, cells }
}
