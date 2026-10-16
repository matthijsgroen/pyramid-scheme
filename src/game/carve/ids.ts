import type { FloorConfig, SideSection, SubSection } from "../siteTypes"
import type { Mark } from "../mark"
import { isEdgeGate } from "../obstacles"
import { stairIdAt } from "../stairAddress"
import type { FloorPrep, FloorRef, Rung } from "./state"

// A GATE IS NAMED BY WHERE THE FLOOR WAS AUTHORED AND THE SECTION IT STANDS ON, NEVER BY THE CARVE.
// Same reasoning as a switch's `switch:` stem: a position kept from an earlier layout must not come
// to fit a door it was never thrown for, and an authoring address is what a re-carve cannot move.
export const switchStem = (floorRef: FloorRef, n: number) =>
  `switch:${floorRef.journeyId}#${floorRef.levelIndex ?? 0}#${floorRef.floorIndex}#${n}`
export const handleStem = (floorRef: FloorRef, n: number) =>
  `handle:${floorRef.journeyId}#${floorRef.levelIndex ?? 0}#${floorRef.floorIndex}#${n}`

// AN OBSTACLE'S KEY IS NAMED THE SAME WAY: where the floor was AUTHORED plus the obstacle's own
// AUTHORED id — neither of which a re-carve can move, so a saved lever position cannot come to fit
// a door it was never thrown for.
export const gateKeyOf = (floorRef: FloorRef, id: string) =>
  `obstacle:${floorRef.journeyId}#${floorRef.levelIndex ?? 0}#${floorRef.floorIndex}:${id}`

// The id a stairhead here takes when the authoring named none — the floor's own address plus where
// on it the stairs stand, built by the one constructor world generation also mints ids with, so a
// floor assembled from an unnamed stairhead lands on the same id the spec would have given it.
export const stairOnThisFloor = (floorRef: FloorRef, path: string) =>
  stairIdAt({
    journeyId: floorRef.journeyId,
    pyramidIndex: floorRef.levelIndex ?? 0,
    floorIndex: floorRef.floorIndex,
    path,
  })

/** How a gate counts its owners, where the author wrote one. */
export const obstacleMode = (authored: FloorConfig, id: string) => {
  const found = (authored.obstacles ?? []).find(o => o.id === id)
  return found?.kind === "gate" ? found.mode : undefined
}

/** The gates one fork-switch owns, by the id the author gave them. */
export const gatesOwnedBy = (authored: FloorConfig, controlId: string) =>
  (authored.obstacles ?? []).flatMap(o => (isEdgeGate(o) && o.owners?.includes(controlId) ? [o] : []))

/** A lever stands in a room of its own, so a chain holding one is carved a room longer. */
export const leverRooms = (leverAtPositional: ReadonlySet<string>, positional: string): number =>
  leverAtPositional.has(positional) ? 1 : 0

// Every room a chain has to hold: its own content, its terminal room, its gate where it has one, and
// the lever where one stands in it.
export const chainRoomCount = (
  leverAtPositional: ReadonlySet<string>,
  section: SideSection | SubSection,
  positional: string
): number => section.pathPuzzles + 1 + (section.gate ? 1 : 0) + leverRooms(leverAtPositional, positional)

// WHOSE GATE THIS IS DECIDES WHETHER ANYTHING STANDS IN IT. `openWaysOut` (useAssembledFloor) gives a
// cell back its corridor only where NOTHING stands in it — a gate a family renders is opened by what
// the player does in it — so a family on a lever's door would leave the lever unable ever to open it.
// A switch's own doors carry none for the same reason (see closeWaysOut).
export const isHandleGate = (prep: Pick<FloorPrep, "config" | "mechanisms">, positional: string): boolean => {
  const address = prep.config.addressOf.get(positional)
  return address !== undefined && prep.mechanisms.handleGateKeyByAddress.has(address)
}

/** The mark the `n`-th switch wears, on its junction and on every door it mints. */
export const switchMark = (prep: Pick<FloorPrep, "marks">, n: number): Mark =>
  prep.marks.allocation.marks.get(`switch:${n}`)!

/** A node's id: the site and where the node stands. */
export const nid = (siteId: string, r: number, c: number) => `${siteId}-${r}-${c}`

// `packing` targets the main path's actual walkable *length*, not the grid's bounding box: the
// maze's true farthest node is always as long a route as it can offer, so a winding corridor would
// be "as long as physically possible" regardless of how little content it carried or how small the
// surrounding grid was. `targetDistance` (node-hops, not counting the connector cell between each
// pair) is what the maze aims for instead: `mainPathCells` hops at packing=0 (walk exactly enough
// to fit the main path's own content, no wandering) scaling up to `mainPathCells * 6` at packing=1
// and beyond for packing>1. Deliberately scaled by `mainPathCells`, not the fuller `minCells` —
// side-section content branches off the main path rather than extending it, so a floor with two
// chunky gated sections shouldn't get a longer main path than one with none, just because minCells is
// bigger. The maze falls back to its farthest node when a grid is too small to reach the target.
export const distanceFor = (prep: Pick<FloorPrep, "sizing">, packing: number) =>
  Math.max(1, Math.round(prep.sizing.mainPathCells * (1 + 5 * packing)))

// The same `packing` scaling applied to every section/sub-section chain, so a gated path hears both
// `packing` and `corridorStraightness` the way the rest of the floor does. Reusing the identical
// formula (not a separate, lighter-touch one) keeps one mental model for "how long is a walk"
// everywhere in the DSL, main path or side path alike.
//
// `chainPacking` is `packing` for every ordinary attempt; the ladder's recovery winds it down, trading a
// side path's cosmetic wandering for a layout that fits at all.
export const paddedChainLength = (chainPacking: number, contentCellsCount: number): number =>
  Math.max(contentCellsCount, Math.round(contentCellsCount * (1 + 5 * chainPacking)))

// What the carve *actually* consumes, as opposed to `minCells`'s bare content count: every
// side-section and sub-section chain is carved at its `paddedChainLength`, which is 6× its
// content at packing=1 and 11× at packing=2. Sizing the grid off `minCells` undershoots badly on
// floors with many side sections (expert and up), which only shuffle luck on a grown grid would
// rescue. This is the honest figure, and it moves with `chainPacking`, so recovery re-sizes the grid
// to whatever it has wound the chains down to rather than leaving a shrunken floor rattling around a
// huge grid.
export const carvedCells = (
  prep: Pick<FloorPrep, "sizing" | "sections" | "mechanisms">,
  chainPacking: number
): number => {
  const { leverAtPositional } = prep.mechanisms
  return (
    prep.sizing.mainPathCells +
    prep.sizing.lockCells +
    prep.sections.sideSections.reduce((sum, sec, idx) => {
      const secCells = paddedChainLength(chainPacking, chainRoomCount(leverAtPositional, sec, `s${idx}`))
      const subCells = (sec.sideSections ?? []).reduce(
        (s2, sub, subIdx) =>
          s2 + paddedChainLength(chainPacking, chainRoomCount(leverAtPositional, sub, `s${idx}.${subIdx}`)),
        0
      )
      return sum + secCells + subCells
    }, 0)
  )
}

const FOOTPRINT_SLACK_PER_ROOM = 2

// Derive odd grid size. Only even/even positions can hold a real node, so usable node capacity is
// ((N+1)/2)^2, not N^2: the odd-position lattice between nodes is what guarantees a genuine gap
// wherever the path winds back near itself. Sized to comfortably fit whichever is bigger: the content
// itself (`contentCells` + packing-scaled headroom for section carving), or enough room for a maze to
// actually offer a path of `targetDistance` hops (a DFS-maze's diameter is typically a large fraction
// of its total node count, so `targetDistance * 2` is a generous safety margin — if it's still not
// enough, the ladder grows N further; the maze never fails outright).
export const deriveN = (
  prep: Pick<FloorPrep, "sizing" | "sections">,
  { packing, targetDistance }: Pick<Rung, "packing" | "targetDistance">,
  contentCells: number
): number => {
  const sections = prep.sections.sideSections.length
  let n = 3
  while (
    Math.pow((n + 1) / 2, 2) <
    Math.max(
      contentCells +
        packing *
          (contentCells * 3 + (n + 1) / 2 + sections + prep.sizing.expectedFootprintRooms * FOOTPRINT_SLACK_PER_ROOM),
      targetDistance * 2
    )
  )
    n += 2
  return n
}
