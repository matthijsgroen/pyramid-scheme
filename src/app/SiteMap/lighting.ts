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
 * DELIBERATELY SHORT OF THE TORCH, and that is the number's whole job. A shaft has to be the brightest
 * thing in the room it falls in — light in the air is light that missed, and a chamber lifted to the top
 * of the map's range leaves the shaft and its pool nothing to be bright against, which is a beam drawn as
 * a smudge on a pale floor. So the room takes enough of the daylight to read from the doorway and no
 * more, and the rest of the range is left for what the beam does on its way down (`MapBeams`).
 *
 * Read off the RENDERED PAGE rather than modelled — a Storybook shot of a starter floor, sampled as mean
 * L* over a patch of paving. Unlit floor 27.1, a beamed room's own floor 38.8, a ray in the air 44.8, the
 * patch of sun it lands in 66.6. Twelve steps up from the night to say the room is lit, twenty-eight more
 * to say where the light comes in. Composited off the art alone the same numbers come out several L*
 * apart, because the page also carries the scatter, the sand drift and the second shade pass; what the
 * player sees is what this is solved against.
 *
 * ONE NUMBER, NOT ONE PER RANK. The night is already solved to land every rank's floor at the same L*, so
 * a light asked for the same lift everywhere needs the same strength everywhere, and a rank that wanted
 * its own would be a rank out of step with the others (docs/instructions/map-rendering.md).
 *
 * TWO LIGHTS IN ONE ROOM DO NOT STACK. `color-dodge` divides, so a beam and a torch drawn over each other
 * multiply their scales and take the floor half again above anything else on the map. So the beam's light
 * hands over to the lamp instead of adding to it (`MapBeams`) — and since the lamp is the brighter of the
 * two, walking into a beamed room lifts it rather than dimming it.
 */
export const BEAM_STRENGTH = 0.4

/** How much likelier a chamber with a statue in it is to have the hole in its roof.
 *
 * A shaft that lands on a statue is the picture the feature exists for, and chance alone puts most of
 * them on bare floor. DOUBLE AND NO MORE: at the top rank the chance is already a third, and three times
 * it is over one — every statue on a merchant's floor under its own shaft, which is not a coincidence any
 * more but a rule the player would read off the map. */
export const STATUE_ODDS = 2

/** How many roofs may have given way on one floor.
 *
 * A SHAFT IS AN EVENT, and the per-chamber odds cannot say so on their own: they are a rate, so a floor
 * with thirty rooms breaks three times as many roofs as a floor with ten and the thing that was meant to
 * make you look up becomes the lighting. Three is the most a floor can carry and still have the first one
 * mean something. */
export const MAX_SHAFTS = 3

/** How many MORE a floor with daylight of its own may break, over the three its chambers already get.
 *
 * A SEPARATE ALLOWANCE RATHER THAN A BIGGER CAP, and the counts are why: a floor has ten to twenty
 * chambers and hundreds of corridor cells, so one pool sorted by draw would hand every shaft on the floor
 * to a passage and the rooms would go dark. The chambers keep the three they have always had, and a floor
 * with daylight in it breaks up to three more roofs over its runs. */
export const CORRIDOR_SHAFTS = 3

/** How many of those this floor may have, at its own daylight. */
const corridorShaftAllowance = (daylight: number) => Math.round(CORRIDOR_SHAFTS * daylight)

/**
 * WHAT A FLOOR'S OWN DAYLIGHT COSTS THE NIGHT AND THE LAMP.
 *
 * A floor is overgrown because its roof failed and nothing grows in the dark, so the plant and the light
 * are the same number: the night comes off in proportion to the growth (`daylight` is the condition's own
 * amount — moodSettings.ts) and the floor lifts toward what a lamp gives. The whole ladder has to move
 * with it. Lifting the baseline alone leaves the lamp's room darker than the passage outside it; leaving
 * the lamp alone takes a lit room past the patch of sun, which is the one thing that must stay brightest.
 *
 * Solved on the RENDERED PAGE, expert stone, mean L* over a patch of paving — as slice one solved its own
 * ladder, because the page carries the scatter, the drift, the green wash and the second shade pass and
 * the art alone does not. The same floor, the same rank, the same distance from the flame:
 *
 * |                     | no condition | fully overgrown |
 * | ------------------- | ------------ | --------------- |
 * | unlit paving        | 25.1         | 40.3            |
 * | a beamed room       | 43.2         | 44.6            |
 * | the lamp's own room | 56.6         | 56.0            |
 * | the patch of sun    | 66.1         | 63.1            |
 *
 * THE LIT FLOOR LANDS WHERE IT ALWAYS DID, and the dark around it comes up to meet it. That is what "you
 * have stopped needing the torch" looks like from inside the picture: the lamp is worth 31 L* on an
 * ordinary floor and 16 on a floor grown through, and the shaft is still the brightest thing in either.
 * `color-dodge` is a scale, not an addition, so the lamp left at full strength over a baseline lifted
 * this far would be worth 40 and take the lit room past the patch of sun.
 *
 * EVERY FUNCTION HERE RETURNS TODAY'S VALUE AT 0, which is what keeps a floor with no condition on it
 * exactly where slice one left it.
 */
const NIGHT_OFF = 0.55
const LAMP_OFF = 0.69
const lampLeft = (daylight: number) => 1 - LAMP_OFF * daylight

/** How much of the tier's night this floor still carries — the strength both passes of `FloorShade` are
 * drawn at. */
export const floorNight = (daylight = 0) => 1 - NIGHT_OFF * daylight
/** The lamp over the floor, and its lighter pass over what stands on the floor. */
export const lampStrength = (daylight = 0) => LIT_STRENGTH * lampLeft(daylight)
export const lampStandingStrength = (daylight = 0) => LIT_STANDING_STRENGTH * lampLeft(daylight)
/** The shaft over the room it falls in. It comes down with the lamp, so the two still hand over to each
 * other where they fall on the same room (`MapBeams`). */
export const shaftStrength = (daylight = 0) => BEAM_STRENGTH * lampLeft(daylight)

/** Every corridor cell of a floor, in a fixed order, with the draw that decides whether its roof gave
 * way. Fogged cells are drawn for and then dropped, so lifting the fog never moves a shaft that is
 * already there — the same reason chambers are indexed by the floor's own list and not by what is seen. */
const corridorShafts = (
  grid: FloorGrid,
  claims: RoomClaims,
  chance: number,
  siteId: string,
  allowance: number
): string[] => {
  if (allowance <= 0) return []
  const rolled: Array<{ cell: string; roll: number }> = []
  let index = 0
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.cells[row][col]
      if (cell.type !== "corridor") continue
      const roll = hashUnit(siteId, "beam-run", index++)
      if (cell.state === "fogged" || roll >= chance) continue
      rolled.push({ cell: `${row},${col}`, roll })
    }
  }
  // ONE TO A RUN. A shaft lights its whole run to the next turn (`litPlaceCells`), so a second one
  // further along the same passage adds a cone and no light, and the two read as a rule rather than as a
  // roof that happened to fail. Strongest draw first, then the run it lights is spoken for.
  const taken = new Set<string>()
  const shafts: string[] = []
  for (const { cell } of rolled.sort((a, b) => a.roll - b.roll)) {
    if (shafts.length >= allowance) break
    if (taken.has(cell)) continue
    shafts.push(cell)
    const [row, col] = cell.split(",").map(Number)
    for (const lit of litPlaceCells(grid, claims, [row, col])) taken.add(lit)
  }
  return shafts
}

/**
 * Which cell a shaft of daylight comes down in — one per room at most, and on a floor with daylight of
 * its own, in its passages too.
 *
 * The chamber candidates are the owners in `claims.claimedBy`: a room with a footprint, which is what
 * makes it a place rather than a passage. A CORRIDOR GETS ONE ONLY WHERE THE FLOOR ALREADY HAS DAYLIGHT
 * IN IT. On an ordinary floor a shaft in a one-cell passage is a thing the player walks through and the
 * light is a room's, not a corridor's; on a floor whose roof has failed far enough to grow plants, the
 * passages are most of what there is to light and a run lit to its next turn is the point of it.
 *
 * TWO DRAWS FOR A CHAMBER, not one. The first decides whether the roof gave way; the second picks which
 * cell of the footprint it gave way over, so a wide chamber does not always light from its owner's corner.
 *
 * A fogged place draws none, so a beam lights somewhere already discovered and reveals nothing the fog
 * holds back. The draw is indexed by the floor's OWN list of chambers and of corridor cells, which
 * exploration never changes — indexing a list that grows moves everything in it (`MapMood`).
 */
export const beamShafts = (
  grid: FloorGrid,
  claims: RoomClaims,
  chance: number,
  siteId: string,
  daylight = 0
): string[] => {
  if (chance <= 0) return []
  const footprints = new Map<string, string[]>()
  for (const [cell, owner] of claims.claimedBy) {
    const footprint = footprints.get(owner) ?? [owner]
    footprint.push(cell)
    footprints.set(owner, footprint)
  }
  const shafts: Array<{ cell: string; roll: number }> = []
  const owners = [...footprints.keys()].sort()
  owners.forEach((owner, index) => {
    const footprint = footprints.get(owner) ?? []
    const odds = footprint.some(cell => claims.decorationAt.get(cell) === "statue") ? STATUE_ODDS : 1
    const roll = hashUnit(siteId, "beam", index)
    if (roll >= chance * odds) return
    const [row, col] = owner.split(",").map(Number)
    const room = cellAt(grid, row, col)
    if (room.type === "empty" || room.state === "fogged") return
    // ON THE FLOOR, not in the margin. A claim may reach outside the grid — an entrance room's footprint
    // is mostly the strip beyond the edge — and a shaft landing there draws its rays and its pool in the
    // black beside the map, which reads as a light leak off the edge of the world.
    const inside = footprint.filter(cell => {
      const [r, c] = cell.split(",").map(Number)
      return r >= 0 && c >= 0 && r < grid.rows && c < grid.cols
    })
    if (inside.length === 0) return
    shafts.push({ cell: inside[Math.floor(hashUnit(siteId, "beam-cell", index) * inside.length)], roll })
  })
  // A FEW, NEVER A ROOFLESS FLOOR. The odds are per chamber, so a big floor at a generous rank can break
  // a dozen roofs and the shaft stops being the thing you notice about the room it is in. The cap keeps
  // it an event: whichever rooms drew strongest get theirs, which is a fair way of choosing because the
  // draw is what the odds already decided by — taking the first few in cell order would hand every shaft
  // to the top-left corner of the map.
  return [
    ...shafts
      .sort((a, b) => a.roll - b.roll)
      .slice(0, MAX_SHAFTS)
      .map(({ cell }) => cell),
    ...corridorShafts(grid, claims, chance, siteId, corridorShaftAllowance(daylight)),
  ]
}

/** How far a shaft leans, and which way, as a share of the slant it would take in a room (`MapBeams`).
 *
 * DAYLIGHT COMES IN AT AN ANGLE, and the travel from the hole to the patch of sun is what tells the eye
 * the bright patch is on the floor and the pale volume is in the air. IT HAS TO HAVE SOMEWHERE TO LAND.
 * A one-cell passage is rock on both flanks, and a pool thrown a cell sideways lands in the black beside
 * the map — a light leak off the edge of the world, the same thing `beamShafts` refuses when a chamber's
 * footprint reaches past the grid.
 *
 * So the lean goes to the side that has floor on it, takes the other side where only that one has, and
 * where neither has is pulled in to what the cell itself can hold: the light comes down the passage
 * rather than across it. Seeded off the CELL, not off the shaft's place in the list — there are only ever
 * a handful of shafts, so an index seed draws the same two or three leans on every floor in the game. */
export const PENNED_LEAN = 0.2
export const shaftLean = (grid: FloorGrid, claims: RoomClaims, siteId: string, key: string): number => {
  const [row, col] = key.split(",").map(Number)
  const drawn = hashUnit(siteId, `beam-lean:${key}`, 0) < 0.5 ? -1 : 1
  const ground = (side: number) =>
    cellAt(grid, row, col + side).type !== "empty" || claims.claimedBy.has(`${row},${col + side}`)
  if (ground(drawn)) return drawn
  if (ground(-drawn)) return -drawn
  return drawn * PENNED_LEAN
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
