import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { resolveEncounterMeta, resolveKeyRequirements } from "./allFamilyMeta"
import { resolveOneWayRealisation, resolvePassageRealisation, resolveRegionBarrierRealisation } from "./registeredMods"

/** One floor carved as play carves it, at the seed and packing its authoring carries. Reads no file, so the browser
 * carves with it too. */
export const carveWorldFloor = (
  journeyId: string,
  levelNr: number,
  floorIndex: number,
  config: FloorConfig
): FloorGrid => {
  const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
  const result = assembleFloor(journeyId, config, seed, resolveEncounterMeta, {
    resolveKeyRequirements,
    floorRef: { journeyId, levelIndex: levelNr - 1, floorIndex },
    resolveOneWay: resolveOneWayRealisation,
    resolveRegionBarrier: resolveRegionBarrierRealisation,
    resolvePassage: resolvePassageRealisation,
  })
  if (!result.success)
    throw new Error(
      `${journeyId} pyramid ${levelNr} floor ${floorIndex} will not carve: ${JSON.stringify(result.reasons)}`
    )
  return result.grid
}
