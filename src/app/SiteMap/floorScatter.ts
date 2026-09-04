import type { FloorGrid } from "@/game/siteTypes"
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
 * GROUND is what blows in and falls: sand and rubble, anywhere the player walks, a passage very much
 * included. FURNISHING is a mat, which belongs to an ENCOUNTER room — a chamber someone furnished. Not
 * to any cell of type "room": that includes the `portal` rooms, which are the floor's entrance and its
 * way out, and a rug laid under the exit marker reads as part of the marker.
 *
 * Picking one kind per cell over all the cells was measured over the generated world and failed at both
 * ends: a real floor has around fifty walkable cells of which only a couple are rooms, so a mat turned
 * up 36 times across 166 floors — one floor in five — while the ground pass ran into its own ceiling on
 * every floor. Giving the rooms their own pass makes a mat as common as rooms are, and lets the ground
 * be thinned without thinning it away.
 */
const GROUND_KINDS: readonly ScatterKind[] = ["sand", "rubble"]

/** One piece per this many walkable cells, within the bounds. Measured at 6.9 a floor when the divisor
 * was 7 and the cap 7 — which is to say every floor was at the cap, and a passage with something in
 * nearly every stretch of it stops reading as a passage. */
const CELLS_PER_GROUND = 12
const MIN_GROUND = 2
const MAX_GROUND = 5

/** And a mat for about every third room, never more than two on a floor. */
const ROOMS_PER_MAT = 3
const MAX_MATS = 2

/**
 * Where the scatter lies on this floor, as `"row,col" -> kind`.
 *
 * Keyed off the floor's OWN cell shape and never off what has been revealed — the same trap `MapLife`
 * documents. A list that grows as the map is explored moves everything indexed into it, so a drift of
 * sand would crawl to another cell each time the player lit a new room.
 */
export const scatterFor = (grid: FloorGrid): ReadonlyMap<string, ScatterKind> => {
  const walkable: Array<readonly [number, number]> = []
  const rooms: Array<readonly [number, number]> = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      // A PORTAL room is the floor's entrance or its way out, and it carries a marker of its own —
      // a stairhead, a star. Nothing is strewn on one, ground included: the brief gives the nobleman
      // "sand over a threshold" and it is a real loss, but a drift drawn under the exit marker reads
      // as part of the marker rather than as sand.
      if (cell.type === "room" && cell.roomType === "portal") continue
      if (cell.type === "room" && cell.roomType === "encounter") rooms.push([r, c])
      if (cell.type === "room" || cell.type === "corridor") walkable.push([r, c])
    }
  }
  const out = new Map<string, ScatterKind>()
  if (walkable.length === 0) return out

  const mats = Math.min(MAX_MATS, Math.floor(rooms.length / ROOMS_PER_MAT))
  for (let i = 0; i < mats; i++) {
    const [r, c] = rooms[Math.floor(hashUnit(grid.siteId, "mat-cell", i) * rooms.length)]
    out.set(`${r},${c}`, "mat")
  }

  // Ground goes down after the mats and may overwrite one: a drift of sand across a rug is a thing that
  // happens, and letting it win keeps the total honest rather than growing the count to fit both.
  const ground = Math.min(MAX_GROUND, Math.max(MIN_GROUND, Math.round(walkable.length / CELLS_PER_GROUND)))
  for (let i = 0; i < ground; i++) {
    const [r, c] = walkable[Math.floor(hashUnit(grid.siteId, "ground-cell", i) * walkable.length)]
    out.set(`${r},${c}`, GROUND_KINDS[Math.floor(hashUnit(grid.siteId, "ground-kind", i) * GROUND_KINDS.length)])
  }
  return out
}
