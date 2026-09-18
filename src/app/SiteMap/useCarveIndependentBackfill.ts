import { useEffect, useRef } from "react"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { journeys as journeyData } from "@/data/journeys"
import { getFamilyPlugin, resolveEncounter } from "@/app/families/familyRegistry"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { boardIndexesForFloor } from "./boardIndexes"
import { migrateJourneyToCarveIndependent, type AssembleFor } from "./cellIdentity"

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
        floorRef: { journeyId, floorIndex },
        resolveBoardIndex: boardIndexesForFloor(journeyId, levelNr - 1, floorIndex),
      }
    )
    return result.success ? result.grid : null
  }
}

/**
 * Re-keys a save's per-cell state — exploration, position, disarmed traps, bought stock, skipped
 * consumables — from grid coordinates onto cell addresses, once, on the first launch that has this
 * code (docs/game-design/world-stability.md).
 *
 * IT HAS TO RUN BEFORE ANY FLOOR MOVES. A coordinate only means something against the carve it was
 * written against, so the translation reads the floors while this release still produces the old ones.
 * That is the whole reason the reshape waits for the release after this one, and why `exploredSections`
 * is still written: it is the archive this reads, and it goes when the floors move.
 *
 * It runs again whenever the key format itself changes (`cellKeyVersion`), which is why the archive
 * earns its keep — a re-keying costs one launch rather than a player's run.
 *
 * Only the floors the save actually names are assembled — a handful of milliseconds each, once ever,
 * rather than a sweep of the world.
 */
export const useCarveIndependentBackfill = (journeys: JourneyAPI) => {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const outstanding = journeys.journeysNeedingReKey()
    if (!outstanding.length) return
    done.current = true
    for (const stored of outstanding) {
      journeys.setCarveIndependentState(
        stored.journeyId,
        migrateJourneyToCarveIndependent(stored, assemblerFor(stored.journeyId))
      )
    }
  }, [journeys])
}
