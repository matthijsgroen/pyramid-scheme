import type { Difficulty } from "@/data/difficultyLevels"
import { difficulties } from "@/data/difficultyLevels"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import { cellAt } from "@/game/roomFootprint"
import { DIR_MOVES, OPPOSITE_DIR, isCorridorCorner } from "./corridorRuns"
import { nightAlpha } from "./tileMaterials"
import type { RoomClaims } from "./roomClaims"

// HOW FAR THE LAMP REACHES, AND WHAT THE NIGHT COSTS — the numbers and the reasoning behind them, with
// no drawing in the file. `torchlight.tsx` paints what these decide; the whole argument is in
// docs/instructions/map-rendering.md.

/** How much of the tier's night the second pass lays over everything standing — see `FloorShade`. */
export const SEATING_PASS = 0.45
/**
 * The modelling that pass takes out of a prop, handed back to it.
 *
 * A WASH DIMS AND FLATTENS IN THE SAME STROKE (`art × (1−a) + wash × a`): the furniture seated in a dark
 * room came out not only darker but flatter, a pale slab of a bench with no shadow left in its own joints,
 * lying on the floor rather than standing on it. The value the night gives it is wanted; the lost contrast
 * is not, and it is exactly `1 − a` of it, so this is that scale inverted. A prop may be as dark as the
 * room is — it just has to keep its own darks, which is what a shape reads by against stone of its own
 * value.
 *
 * Per sprite rather than on the layer holding them: a filter rasterises its subtree as ONE layer, and the
 * standing layer is the size of the map (`docs/instructions/map-rendering.md`). A prop's own box is a cell.
 */
export const STANDING_RELIEF: Record<Difficulty, string> = Object.fromEntries(
  difficulties.map(tier => [tier, `contrast(${(1 / (1 - nightAlpha(tier) * SEATING_PASS)).toFixed(2)})`])
) as Record<Difficulty, string>
export const LIT_STRENGTH = 0.5
export const LIT_STANDING_STRENGTH = 0.25

/**
 * The PLACE the explorer is standing in — a whole chamber, or the stretch of corridor they are on.
 *
 * A place, never a tile. A torch carried into a room lights the room; carried along a passage it lights
 * the passage as far as the next turn. Lighting the single cell drew a bright square on a floor with no
 * edge to justify it, which read as a tile rather than as somewhere being lit.
 *
 * The room case has to handle standing on the room's OWN cell as well as on one it claims: `claimedBy`
 * maps a claimed cell to its owner and has no entry for the owner itself, so looking up the owner and
 * stopping there lit one square whenever the player stood in the middle of their own chamber.
 */
export const litPlaceCells = (grid: FloorGrid, claims: RoomClaims, at: readonly [number, number]): string[] => {
  const here = `${at[0]},${at[1]}`
  const owner = claims.claimedBy.get(here) ?? here
  const footprint = [owner, ...[...claims.claimedBy.entries()].filter(([, o]) => o === owner).map(([cell]) => cell)]
  if (footprint.length > 1) return footprint

  const cell = cellAt(grid, at[0], at[1])
  if (cell.type !== "corridor") return [here]

  // The run: out from the cell in every open direction, following the passage until it turns or opens
  // into something else. The turn itself is included — a light that stopped one cell short of the corner
  // would leave the corner darker than the straight, which is the opposite of how a corner reads.
  const cells = [here]
  for (const dir of cell.dirs) {
    let [dr, dc] = DIR_MOVES[dir]
    let r = at[0] + dr
    let c = at[1] + dc
    let from: Direction = dir
    for (let steps = 0; steps < grid.rows + grid.cols; steps++) {
      const next = cellAt(grid, r, c)
      if (next.type !== "corridor" || next.state === "fogged") break
      cells.push(`${r},${c}`)
      if (isCorridorCorner(next.dirs)) break
      const onward = ([...next.dirs] as Direction[]).find(d => d !== OPPOSITE_DIR[from])
      if (!onward) break
      ;[dr, dc] = DIR_MOVES[onward]
      r += dr
      c += dc
      from = onward
    }
  }
  return cells
}
