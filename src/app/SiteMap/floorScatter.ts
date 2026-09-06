import type { Difficulty } from "@/data/difficultyLevels"
import type { DecorationKind, FloorGrid } from "@/game/siteTypes"
import type { RoomClaims } from "./SiteMapView"
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
export type ScatterKind = "sand" | "rubble" | "mat"

/**
 * The kinds the scatter layer places — what blows in and falls, on the cells the player walks.
 *
 * These names ALSO appear in the ranks' authored `decorations` pools, and a room that rolls one is
 * dressed with it: `Decoration` draws it standing, on an empty claimed cell nobody walks, through
 * `STANDING_VARIANT`. So a name here is not a name excluded from the prop layer — it is a name that
 * means two different objects depending on which layer asked for it. A spill of brick underfoot and a
 * heap of it in the corner of a chamber are both `rubble`.
 *
 * The pools are left alone deliberately: that is a generated world, and re-authoring them reshuffles
 * every prop in it — `pickDressing` indexes by pool LENGTH, so dropping a name moves the prop in every
 * room that has one. Which layer a kind belongs to is a renderer decision, and it is made here and in
 * `STANDING_VARIANT`.
 */
/** What a floor kind is drawn as when a ROOM was dressed with it, rather than when it blew in.
 *
 * The two are not the same object. Scatter lies on cells the player walks over, so it has to be flat
 * enough to walk through — a drift, a spill, a mat underfoot. A room's dressing lands on an empty
 * claimed cell the player CANNOT walk on (see `decorationAt`), so it is free to stand up and be walked
 * around: a knee-high heap of fallen brick is a thing in the corner of a chamber, and it would be
 * nonsense in the middle of a passage.
 *
 * `mat` needs no variant — a mat is flat wherever it lies, and on a cell nobody walks it simply reads
 * as a rug against the wall. Only `rubble` is two objects sharing one name. */
export const STANDING_VARIANT: Partial<Record<DecorationKind, string>> = { rubble: "rubbleHeap" }

export const FLOOR_KINDS: ReadonlySet<string> = new Set<ScatterKind>(["sand", "rubble", "mat"])

/** One drift of blown sand: where it lies, and how many CELLS across it is. */
export type Drift = { row: number; col: number; cells: number }

/** Drifts to a floor, by walkable cells. Sparse on purpose — sand is weather, not furnishing. */
const CELLS_PER_DRIFT = 26
const MIN_DRIFTS = 1
const MAX_DRIFTS = 4

/**
 * Where the SAND lies, as drifts rather than as cell-sized sprites.
 *
 * Sand is the one scatter kind that is not an object. A mat and a spill of brick have edges and sit on a
 * cell; a drift has blown in, pooled against whatever stopped it, and has no silhouette of its own —
 * which is exactly the wall `prim_mat` records for anything flat on the floor, and the reason a
 * cell-sized sand sprite has never read as more than a stain with an outline.
 *
 * So a drift is drawn LARGER THAN A CELL and clipped to the walkable floor, which the renderer already
 * has as one path. It crosses cells, it stops dead at a wall, and the shape it ends up with is the shape
 * of the room it blew into rather than anything the art had to guess. `tile-art-brief` §4 asks for "a fan
 * of sand through a breach", which was never a cell-sized object in the first place.
 *
 * It also collapses the art to ONE file. Sand has its own colour — it is sand, not the rank's stone in
 * another shade — so it is the same sand in all five tombs and lives in `tiles/default/`, the way the
 * explorer does: one person walks all five, and one desert blows into all five.
 *
 * THE GODS GET NONE. §4 gives the last rank "no sand at all — a clean seam", and that is the only
 * per-rank difference sand has once its colour stops being one.
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
    // Two to three and a half cells across: big enough to cross a passage and pool in a corner, small
    // enough that a floor never becomes a beach.
    return { row, col, cells: 2 + hashUnit(grid.siteId, "drift-size", i) * 1.5 }
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
 * Both halves were got wrong before, and the same blind spot did it twice. A claimed cell is
 * `type: "empty"` in the grid — the claim is a render-time fact — so walking `grid.cells` and taking
 * only rooms and corridors cannot see a chamber's floor at all. Measured over the generated world:
 * 1475 chambers of 8.78 cells apiece, and 8% of them had any scatter on them, all of it on the one
 * owner cell. Hence a pass that walks the CHAMBERS rather than the cells.
 */
// SAND IS NOT HERE, and that is the point of `driftsFor` below: a drift does not fit in a cell.
const GROUND_KINDS: readonly ScatterKind[] = ["rubble"]
const CHAMBER_KINDS: readonly ScatterKind[] = ["mat", "rubble"]

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
