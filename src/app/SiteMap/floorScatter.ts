import type { Difficulty } from "@/data/difficultyLevels"
import type { FloorGrid } from "@/game/siteTypes"
import type { RoomClaims } from "./roomClaims"
import { hashUnit } from "@/support/hashString"

/**
 * What is lying about on the floor, as opposed to what stands in a room.
 *
 * A PROP stands on a cell the player never walks on — that is deliberate, and it is why there is never
 * a statue in your way. Scatter is the opposite: it is on the floor you walk over, corridors included,
 * several to a floor. So it is drawn under the props and under the explorer, and it goes on the cells
 * the player actually uses.
 *
 * Its own vocabulary rather than a slice of `DecorationKind`, for the same reason `WallDecorationKind`
 * is: a drift of sand is not a thing that could stand in the middle of a chamber. The kinds are the
 * brief's §4 (docs/game-design/tile-art-brief.md) and resolve as `tiles/<tier>/<kind>.png`, so a rank
 * is a skin and not a new set of files.
 */
export type ScatterKind = "sand" | "rubbleSpill" | "mat"

/**
 * The kinds the scatter layer places — what blows in and falls, on the cells the player walks.
 *
 * `mat` also appears in the ranks' authored `decorations` pools, and a room that rolls one is dressed
 * with it — a mat is flat wherever it lies, so the same file serves both layers.
 *
 * Broken brick is two objects under two names: `rubbleSpill` here, flat enough to walk through, and
 * `rubblePile` in the pools, knee-high in a corner where nobody walks. One name for both cost three
 * separate bugs.
 *
 * **Renaming a kind is cheap.** `pickDressing` is `pool[hash(...) % pool.length]`, so only a change of
 * LENGTH moves placements — a rename keeps the index. 698 pool entries renamed moved no room's prop.
 */

export const FLOOR_KINDS: ReadonlySet<string> = new Set<ScatterKind>(["sand", "rubbleSpill", "mat"])

/** Scatter kinds drawn as DRIFTS rather than as cell-sized sprites — see `driftsFor`. Exported so a
 * sheet staging one stages it the way the map does: centred on the cell and sized in cells, not
 * bottom-anchored in a prop box, which is what it stops being the moment it outgrows a cell. */
export const DRIFT_KINDS: ReadonlySet<string> = new Set(["sand"])

/** One drift of blown sand: where it lies, and how many CELLS it spans on each axis. */
export type Drift = { row: number; col: number; w: number; h: number }

/** Drifts to a floor, by walkable cells. Sparse on purpose — sand is weather, not furnishing. */
const CELLS_PER_DRIFT = 26
const MIN_DRIFTS = 1
const MAX_DRIFTS = 4
/** How far a run is followed before it stops mattering: past this the drift is capped anyway. */
const MAX_RUN = 4

/** Walkable cells in a straight line through (row, col), counting both ways and the cell itself. */
const runThrough = (grid: FloorGrid, row: number, col: number, dr: number, dc: number): number => {
  let n = 1
  for (const sign of [1, -1])
    for (let i = 1; i <= MAX_RUN; i++) {
      const r = row + dr * i * sign
      const c = col + dc * i * sign
      const type = grid.cells[r]?.[c]?.type
      if (type !== "room" && type !== "corridor") break
      n++
    }
  return n
}

/**
 * Where the SAND lies, as drifts rather than as cell-sized sprites.
 *
 * Sand is the one scatter kind that is not an object. A mat and a spill of brick have edges and sit on a
 * cell; a drift has blown in, pooled against whatever stopped it, and has no silhouette of its own —
 * which is exactly the wall `prim_mat` records for anything flat on the floor, and the reason a
 * cell-sized sand sprite has never read as more than a stain with an outline.
 *
 * So a drift is drawn LARGER THAN A CELL and clipped to the walkable floor, which the renderer already
 * has as one path. It crosses cells, stops dead at a wall, and the shape it ends up with is the shape of
 * the room it blew into rather than anything the art had to guess. `tile-art-brief` §4 asks for "a fan of
 * sand through a breach", which was never a cell-sized object in the first place.
 *
 * **A drift is sized to the run it lands in**, which is what makes the clip read as a clip: a square
 * drift in a one-cell passage has every edge cut by a wall, so none of the sand's own shape survives and
 * the corridor just comes out a different colour. It runs LONG along the passage, where the art tapers
 * and shows its edge, and overflows ACROSS it, where the wall does the cutting.
 *
 * One file for the art: sand has its own colour in all five tombs, so it lives in `tiles/default/` like
 * the explorer. The gods' rank gets none — a clean seam — which is sand's only per-rank difference.
 */
export const driftsFor = (grid: FloorGrid, tier: Difficulty): Drift[] => {
  if (tier === "wizard") return []
  const walkable: string[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const type = grid.cells[r][c].type
      if (type === "room" || type === "corridor") walkable.push(`${r},${c}`)
    }
  if (!walkable.length) return []
  const n = Math.min(MAX_DRIFTS, Math.max(MIN_DRIFTS, Math.round(walkable.length / CELLS_PER_DRIFT)))
  return Array.from({ length: n }, (_, i) => {
    const [row, col] = walkable[Math.floor(hashUnit(grid.siteId, "drift-cell", i) * walkable.length)]
      .split(",")
      .map(Number)
    const across = runThrough(grid, row, col, 0, 1)
    const down = runThrough(grid, row, col, 1, 0)
    // 0.75 of the long run so the sand's own edge is inside the floor; the short run plus a cell so the
    // wall cuts it. Floored at 1.2 — a drift narrower than a cell is a stain again.
    const long = Math.max(1.2, Math.min(MAX_RUN, Math.max(across, down)) * 0.75)
    const short = Math.min(across, down) + 1
    const stretch = 0.9 + hashUnit(grid.siteId, "drift-size", i) * 0.35
    return across >= down ? { row, col, w: long * stretch, h: short } : { row, col, w: short, h: long * stretch }
  })
}

/**
 * Two passes, because the two sorts of scatter are not the same thing and one pass gets both wrong.
 *
 * A CHAMBER is a room with a footprint — it claims the cells around it, so it is a place you enter
 * rather than a station on a corridor. Those cells are what a chamber's floor is made of, and they are
 * where furnishing goes: a mat belongs in a room someone lived in, not in a passage.
 *
 * GROUND is what blows in and falls: sand and rubble, along the passages, where nobody swept.
 *
 * A claimed cell is `type: "empty"` in the grid — the claim is a render-time fact — so walking
 * `grid.cells` for rooms and corridors cannot see a chamber's floor at all, which leaves 1475 chambers
 * of 8.78 cells apiece scattered only on their owner cell. Hence a pass over CHAMBERS, not cells.
 */
// SAND IS NOT HERE, and that is the point of `driftsFor` below: a drift does not fit in a cell.
const GROUND_KINDS: readonly ScatterKind[] = ["rubbleSpill"]
const CHAMBER_KINDS: readonly ScatterKind[] = ["mat", "rubbleSpill"]

/** One piece per this many corridor cells, within the bounds. Measured at 6.9 a floor when the divisor
 * was 7 and the cap 7 — which is to say every floor was at the cap, and a passage with something in
 * nearly every stretch of it stops reading as a passage. */
const CELLS_PER_GROUND = 12
const MIN_GROUND = 2
const MAX_GROUND = 5

/** How many pieces a chamber is dressed with. Its floor is around nine cells, so two is a furnished
 * room and not a junk heap. */
const PER_CHAMBER = 2

/**
 * Where the scatter lies on this floor, as `"row,col" -> kind`.
 *
 * Keyed off the floor's OWN shape and never off what has been revealed — the same trap `MapLife`
 * documents. A list that grows as the map is explored moves everything indexed into it, so a drift of
 * sand would crawl to another cell each time the player lit a new room.
 */
export const scatterFor = (grid: FloorGrid, claims: RoomClaims): ReadonlyMap<string, ScatterKind> => {
  const out = new Map<string, ScatterKind>()

  // ── the chambers, each dressed on its own floor ──
  //
  // Sorted, because the placement is indexed and Map order is insertion order: which chamber is
  // "first" would otherwise depend on how the claims happened to be built.
  const footprints = new Map<string, string[]>()
  for (const [cellKey, ownerKey] of claims.claimedBy) {
    const list = footprints.get(ownerKey)
    if (list) list.push(cellKey)
    else footprints.set(ownerKey, [cellKey])
  }
  for (const [c, [ownerKey, cells]] of [...footprints].sort(([a], [b]) => (a < b ? -1 : 1)).entries()) {
    // NOT the owner's own cell: that is where the room's icon goes — a puzzle's family, an exit's star
    // — and not a cell that already carries the room's prop, which `decorationAt` has put on one of
    // the claims. Dressing lies on the floor AROUND what the room is for.
    const free = cells.filter(key => !claims.decorationAt.has(key) && key !== ownerKey)
    for (let i = 0; i < PER_CHAMBER && free.length; i++) {
      const key = free[Math.floor(hashUnit(grid.siteId, `chamber-cell-${c}`, i) * free.length)]
      out.set(key, CHAMBER_KINDS[Math.floor(hashUnit(grid.siteId, `chamber-kind-${c}`, i) * CHAMBER_KINDS.length)])
    }
  }

  // ── the passages ──
  const corridors: string[] = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.cells[r][c].type === "corridor" && !claims.claimedBy.has(`${r},${c}`)) corridors.push(`${r},${c}`)
    }
  }
  if (corridors.length === 0) return out
  const ground = Math.min(MAX_GROUND, Math.max(MIN_GROUND, Math.round(corridors.length / CELLS_PER_GROUND)))
  for (let i = 0; i < ground; i++) {
    const key = corridors[Math.floor(hashUnit(grid.siteId, "ground-cell", i) * corridors.length)]
    out.set(key, GROUND_KINDS[Math.floor(hashUnit(grid.siteId, "ground-kind", i) * GROUND_KINDS.length)])
  }
  return out
}
