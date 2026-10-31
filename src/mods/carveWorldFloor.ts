import type { Engine } from "@/game/carve/engines"
import { assembleFloor } from "@/game/siteAssembler"
import type { AssembleFloorKeyRequirements } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { AssemblerResult, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { resolveEncounterMeta, resolveKeyRequirements } from "./allFamilyMeta"
import { resolveOneWayRealisation, resolvePassageRealisation, resolveRegionBarrierRealisation } from "./registeredMods"

/** The seed and resolvers play carves a world floor with (`assemblePlayedFloor`), so the bake picks, checks and ships
 * the floor the player walks. A board's index is left out: it deals which board a room draws, never a wall, and it is
 * dealt from the baked world itself. `engine` carves in place of the one every floor ships with. */
export const worldFloorCarve = (journeyId: string, levelNr: number, floorIndex: number, engine?: Engine) => {
  const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
  const resolvers: AssembleFloorKeyRequirements = {
    resolveKeyRequirements,
    floorRef: { journeyId, levelIndex: levelNr - 1, floorIndex },
    resolveOneWay: resolveOneWayRealisation,
    resolveRegionBarrier: resolveRegionBarrierRealisation,
    resolvePassage: resolvePassageRealisation,
  }
  const carve = (config: FloorConfig, maxAttempts?: number): AssemblerResult =>
    assembleFloor(
      journeyId,
      config,
      seed,
      resolveEncounterMeta,
      { ...resolvers, ...(maxAttempts !== undefined ? { maxAttempts } : {}) },
      engine ? { engine } : {}
    )
  return { seed, resolvers: { ...resolvers, resolveEncounter: resolveEncounterMeta }, carve }
}

/** One floor carved as play carves it, at the seed and packing its authoring carries. Reads no file, so the browser
 * carves with it too. */
export const carveWorldFloor = (
  journeyId: string,
  levelNr: number,
  floorIndex: number,
  config: FloorConfig
): FloorGrid => {
  const result = worldFloorCarve(journeyId, levelNr, floorIndex).carve(config)
  if (!result.success)
    throw new Error(
      `${journeyId} pyramid ${levelNr} floor ${floorIndex} will not carve: ${JSON.stringify(result.reasons)}`
    )
  return result.grid
}
