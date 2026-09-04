import type { FloorGrid } from "@/game/siteTypes"
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
 * The kinds drawn on the floor layer, and therefore never as a standing prop.
 *
 * `rubble` and `mat` are still named in the ranks' authored `decorations` pools, because that is a
 * generated world and re-authoring the pools reshuffles every prop in it — `pickDressing` indexes by
 * pool LENGTH, so dropping two names moves the prop in every room that has one. Which LAYER a kind
 * belongs to is a renderer decision anyway, and this is where it is made: `Decoration` skips these and
 * the scatter layer places them instead.
 */
export const FLOOR_KINDS: ReadonlySet<string> = new Set<ScatterKind>(["sand", "rubble", "mat"])

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
const GROUND_KINDS: readonly ScatterKind[] = ["sand", "rubble"]
const CHAMBER_KINDS: readonly ScatterKind[] = ["mat", "rubble", "sand"]

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
