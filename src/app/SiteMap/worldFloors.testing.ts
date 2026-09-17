import { journeys } from "@/data/journeys"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { ResolveKeyRequirements } from "@/game/siteAssembler"
import type { FloorConfig } from "@/game/siteTypes"
// Populate the family registry, exactly as the app does — a room resolves its family through it.
import "@/mods/registerModApps"

/**
 * The world as the sweeps walk it, shared by everything that walks the whole thing.
 *
 * It lives outside a spec file because two of them need it and neither owns it: the suite's own
 * `worldFloorAssembly.spec.ts`, and `worldBoards.verify.ts`, which is not part of a test run at all.
 */

export type Floor = {
  label: string
  config: FloorConfig
  seed: number
  floorIndex: number
  journeyId: string
  levelIndex: number
}

// Mirror useAssembledFloor's own resolver, so a sweep walks the identical code path.
export const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

// Every floor a player can be sent into, at the exact seed the runtime will use.
// Mirrors PyramidExpedition: one site per level number (1-based), falling back to the first
// site config when a journey has more levels than site configs, and SiteMapScreen's own
// per-floor seed offset.
export const allFloors = (): Floor[] => {
  const floors: Floor[] = []
  for (const journey of journeys) {
    const siteConfigs = journey.siteConfigs
    if (!siteConfigs?.length) continue
    const siteSeed = persistentInteriorSeed(journey.id)
    for (let levelNr = 1; levelNr <= journey.levelCount; levelNr++) {
      const levelIndex = levelNr - 1
      const site = siteConfigs[levelIndex] ?? siteConfigs[0]
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
