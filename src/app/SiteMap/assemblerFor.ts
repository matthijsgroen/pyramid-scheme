import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"
import { resolvePassageRealisation } from "@/mods/allPassageRealisations"
import { resolveRegionBarrierRealisation } from "@/mods/allRegionBarrierRealisations"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { journeys as journeyData } from "@/data/journeys"
import { getFamilyPlugin, resolveEncounter } from "@/app/families/familyRegistry"
import { boardIndexesForFloor } from "./boardIndexes"
import type { AssembleFor } from "./cellIdentity"

const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

/** The floors of one journey, assembled exactly as the runtime assembles them (see useAssembledFloor
 * and PyramidExpedition, which together decide the seed and the level index). */
export const assemblerFor = (journeyId: string): AssembleFor => {
  const journey = journeyData.find(entry => entry.id === journeyId)
  const siteSeed = persistentInteriorSeed(journeyId)
  return (levelNr, floorIndex) => {
    const site = journey?.siteConfigs?.[levelNr - 1] ?? journey?.siteConfigs?.[0]
    const config = site?.[floorIndex]
    if (!config) return null
    const result = assembleFloor(
      journeyId,
      config,
      floorAssemblySeed(siteSeed, levelNr, floorIndex),
      resolveEncounter,
      {
        resolveKeyRequirements,
        floorRef: { journeyId, levelIndex: levelNr - 1, floorIndex },
        resolveOneWay: resolveOneWayRealisation,
        resolveRegionBarrier: resolveRegionBarrierRealisation,
        resolvePassage: resolvePassageRealisation,
        resolveBoardIndex: boardIndexesForFloor(journeyId, levelNr - 1, floorIndex),
      }
    )
    return result.success ? result.grid : null
  }
}
