import type { Difficulty } from "@/data/difficultyLevels"
import { difficulties } from "@/data/difficultyLevels"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import { cellAt } from "@/game/roomFootprint"
import { hashUnit } from "@/support/hashString"
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
 * How hard a shaft of daylight lifts the room it falls into.
 *
 * SOLVED AGAINST THE TORCH, not authored: a beamed room has to land on the top end a torch-lit room
 * lands on, or the map gains a second brightness and stops having one. Composited off each rank's floor
 * art through the operators the renderer uses — the night's wash, `color-dodge` at this alpha, the
 * seating wash, the standing pass — and read as L*, the beamed floor lands at 51.7–54.1 against an unlit
 * 23.7–23.9, which is where the torch already puts it to within a tenth.
 *
 * ONE NUMBER, NOT ONE PER RANK, because the solve came back the same on all five: 0.510, 0.512, 0.513,
 * 0.510, 0.510. The night is already solved to land every rank's floor at L* 24, so a light asked for the
 * same top end everywhere needs the same strength everywhere — and a rank that wanted its own would be a
 * rank out of step with the others (docs/instructions/map-rendering.md).
 *
 * TWO LIGHTS IN ONE ROOM DO NOT STACK. `color-dodge` divides, so a beam and a torch drawn over each
 * other multiply their scales: measured, that takes the starter floor to L* 79.6 against the 54.1 either
 * light reaches alone — half again as bright as anywhere else on the map. So the beam's light hands over
 * to the lamp instead of adding to it (`MapBeams`), and because the two are solved to the same top end
 * the handover costs the room nothing; mid-crossfade, with both at half, it measures 56.8.
 */
export const BEAM_STRENGTH = 0.51

/** How much likelier a chamber with a statue in it is to have the hole in its roof.
 *
 * A shaft that lands on a statue is the picture the feature exists for, and chance alone puts most of
 * them on bare floor. DOUBLE AND NO MORE: at the top rank the chance is already a third, and three times
 * it is over one — every statue on a merchant's floor under its own shaft, which is not a coincidence any
 * more but a rule the player would read off the map. */
export const STATUE_ODDS = 2

/**
 * Which cell of which chamber a shaft of daylight comes down in — one per room at most, chambers only.
 *
 * The candidates are the owners in `claims.claimedBy`: a room with a footprint, which is what makes it a
 * place rather than a passage. A corridor never gets one — a shaft in a one-cell passage is something the
 * player walks through.
 *
 * TWO DRAWS, not one. The first decides whether the roof gave way; the second picks which cell of the
 * footprint it gave way over, so a wide chamber does not always light from its owner's corner.
 *
 * A fogged room draws none, so a beam lights a room already discovered and reveals nothing the fog holds
 * back. The draw is indexed by the room's place in the floor's OWN list of chambers, which exploration
 * never changes — indexing a list that grows moves everything in it (`MapMood`).
 */
export const beamShafts = (grid: FloorGrid, claims: RoomClaims, chance: number, siteId: string): string[] => {
  if (chance <= 0) return []
  const footprints = new Map<string, string[]>()
  for (const [cell, owner] of claims.claimedBy) {
    const footprint = footprints.get(owner) ?? [owner]
    footprint.push(cell)
    footprints.set(owner, footprint)
  }
  const shafts: string[] = []
  const owners = [...footprints.keys()].sort()
  owners.forEach((owner, index) => {
    const footprint = footprints.get(owner) ?? []
    const odds = footprint.some(cell => claims.decorationAt.get(cell) === "statue") ? STATUE_ODDS : 1
    if (hashUnit(siteId, "beam", index) >= chance * odds) return
    const [row, col] = owner.split(",").map(Number)
    const room = cellAt(grid, row, col)
    if (room.type === "empty" || room.state === "fogged") return
    shafts.push(footprint[Math.floor(hashUnit(siteId, "beam-cell", index) * footprint.length)])
  })
  return shafts
}

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
