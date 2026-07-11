import { tableauLevels } from "@/data/tableaus"

// The only place that knows a tableau room's completion precondition is "hold enough
// fragments of these specific hieroglyphs" — core (siteAssembler.ts/siteValidator.ts) only
// ever sees the opaque key strings this returns. `hieroglyph:${id}` is this module's own
// convention for "hieroglyph id is complete"; the placement/worklist module that tracks
// fragment counts and grants these keys owns the other end of that convention.
//
// tableauLevels' own fields, per its real consumers (TombExpedition.tsx, TableauInventory.tsx):
// `runNumber` is which REPLAY of the tomb (completionCount + 1), `levelNr`/array position is
// which FLOOR within that replay — there is no "several tableau rooms on one floor"
// dimension in today's data, so `pathIndex` (this floor's own room position, which a future
// floor with multiple tableaus would need) has nothing to match against yet and is accepted
// but unused. World-gen's persistent floor sequence only ever needs run 1 — run 2+ is the
// still-unbuilt revisit mechanic (pyramid-interior-design.md §3).
export const resolveTableauKeyRequirements = (
  journeyId: string,
  floorIndex: number,
  _pathIndex: number
): string[] | undefined => {
  const level = tableauLevels.find(
    t => t.tombJourneyId === journeyId && t.runNumber === 1 && t.levelNr === floorIndex + 1
  )
  return level ? level.inventoryIds.map(id => `hieroglyph:${id}`) : undefined
}
