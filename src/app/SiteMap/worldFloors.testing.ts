import { journeys } from "@/data/journeys"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { ResolveKeyRequirements } from "@/game/siteAssembler"
import type { FloorConfig } from "@/game/siteTypes"
// Populate the family registry, exactly as the app does — a room resolves its family through it.
import "@/mods/registerModApps"

// The world as the sweeps walk it, shared by `worldFloorAssembly.verify.ts` and `worldBoards.verify.ts`.
export type Floor = {
  label: string
  config: FloorConfig
  seed: number
  floorIndex: number
  journeyId: string
  levelIndex: number
}

// Mirrors useAssembledFloor, so a sweep walks the identical code path.
export const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

// Every floor a player can be sent into, at the exact seed the runtime will use. Mirrors
// PyramidExpedition (one site per level number, 1-based) and SiteMapScreen's own per-floor seed
// offset. A journey has exactly one node per site, so every level number here is one a player can
// actually be sent to.
export const allFloors = (): Floor[] => {
  const floors: Floor[] = []
  for (const journey of journeys) {
    const siteConfigs = journey.siteConfigs
    if (!siteConfigs?.length) continue
    const siteSeed = persistentInteriorSeed(journey.id)
    for (let levelNr = 1; levelNr <= journey.levelCount; levelNr++) {
      const levelIndex = levelNr - 1
      const site = siteConfigs[levelIndex]
      site.forEach((config, floorIndex) => {
        floors.push({
          label: `${journey.id} level ${levelNr} floor ${floorIndex}`,
          config,
          seed: floorAssemblySeed(siteSeed, levelNr, floorIndex),
          floorIndex,
          journeyId: journey.id,
          levelIndex,
        })
      })
    }
  }
  return floors
}
