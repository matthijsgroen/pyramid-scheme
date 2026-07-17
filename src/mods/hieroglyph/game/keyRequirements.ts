import { z } from "zod"
import { getTableauLevel } from "@/data/tableaus"
import type { FamilyKeyRequirementResolver } from "@/game/families/familyMeta"

// The only place that knows a tableau room's completion precondition is "hold enough
// fragments of these specific hieroglyphs" — core (siteAssembler.ts/siteValidator.ts) only
// ever sees the opaque key strings this returns. `hieroglyph:${id}` is this module's own
// convention for "hieroglyph id is complete"; the placement/worklist module that tracks
// fragment counts and grants these keys owns the other end of that convention.
//
// `runNr` is author-supplied via FloorConfig/SideSection's `encounterArgs` — no derivation
// from floor position, since a tableau corridor can now be authored anywhere (a ward-gated
// side path, not just the main path), and two corridors on the same floor need to be able
// to name different runs. `levelNr` is never authored: it's `pathIndex + 1`, this room's
// 1-based position among its own section's tableau rooms in path order (see
// ResolveKeyRequirements in siteAssembler.ts for how pathIndex is scoped).
// The tableau encounter's authored args — shared with the play-time tableau plugin so both the
// world-gen resolver and the rendered puzzle validate + read `runNr` the same way.
export const tableauEncounterArgsSchema = z.object({ runNr: z.number().int().positive() })

export const resolveTableauKeyRequirements: FamilyKeyRequirementResolver = ({
  journeyId,
  pathIndex,
  encounterArgs,
}) => {
  const { runNr } = tableauEncounterArgsSchema.parse(encounterArgs)
  const levelNr = pathIndex + 1
  const level = getTableauLevel(journeyId, runNr, levelNr)
  if (!level) {
    throw new Error(
      `resolveTableauKeyRequirements: no tableau for journey "${journeyId}", runNr ${runNr}, levelNr ${levelNr}`
    )
  }
  return level.inventoryIds.map(id => `hieroglyph:${id}`)
}
