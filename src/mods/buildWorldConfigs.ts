import { buildConfigs } from "@/worldGen/configBuilder"
import type { SiteConfig } from "@/worldGen/types"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { worldWebs } from "@/game/webCatalogue"
import type { Web } from "@/game/webNotation"
import { placeWeb, webJourneysOf } from "@/worldGen/webPlacement"
import type { WebPlacement } from "@/worldGen/webPlacement"
import { ALL_CURRENCY_DISTRIBUTIONS } from "./allCurrencyDistributions"
import {
  resolveKeyRequirements,
  familyPriorityFor,
  familyCapacityFor,
  familyIsTrap,
  allocateEncounterSpread,
  resolveEncounterMeta,
} from "./allFamilyMeta"
import {
  CAPPED_CURRENCIES,
  DYNAMIC_DISTRIBUTIONS,
  MOD_WORLD_VALIDATORS,
  MOD_REACHABILITY_SUPPORT,
  MOD_TOMB_TREASURE_RESOLVER,
  MOD_SHOP_STOCK,
  MOD_RESERVED_TREASURE_INDICES,
  MOD_WEB_ACTIVATOR,
  REGISTERED_MOD_IDS,
  resolveOneWayRealisation,
  resolvePassageRealisation,
  resolveRegionBarrierRealisation,
} from "./registeredMods"

/** One floor carved as play carves it, at the seed and packing its authoring carries. */
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

/**
 * THE WEB'S FLOORS CARRY THEIR PINS BEFORE THE WEB IS READ: the last bake's, or the address's own seed where there is
 * none. The search that stamps pins runs after the build and a web moves no wall, so the floor the web is read on is
 * the floor the solver, the bake and play all carve.
 */
const pinWebFloors = (configs: Record<string, SiteConfig[]>) => {
  for (const [, id] of webJourneysOf(configs))
    configs[id].forEach((site, p) =>
      site.forEach((floor, f) => {
        const pinned = generatedWorldConfigs[id]?.[p]?.[f]
        floor.seed ??= pinned?.seed ?? floorAssemblySeed(persistentInteriorSeed(id), p + 1, f)
        if (floor.packing === undefined && pinned?.packing !== undefined) floor.packing = pinned.packing
      })
    )
}

export type BuildWorldOptions = {
  /** The tier webs to place; the ones under src/game/locks by default. */
  webs?: readonly Web[]
  /** Handed each web as it was placed, for the checks run once the floors carry their pins. */
  onWebPlaced?: (placement: WebPlacement) => void
}

/** The world as the spec builds it with every registered mod, before carve seeds are stamped. A web is placed only
 * where a registered mod realises its activators. */
export const buildWorldConfigs = (
  emptyFraction: number,
  options: BuildWorldOptions = {}
): Record<string, SiteConfig[]> => {
  const webs = options.webs ?? worldWebs()
  const toReward = MOD_WEB_ACTIVATOR
  const placeWorldWeb =
    toReward && webs.length > 0
      ? (configs: Record<string, SiteConfig[]>) => {
          pinWebFloors(configs)
          for (const web of webs) options.onWebPlaced?.(placeWeb(web, configs, carveWorldFloor, toReward))
        }
      : undefined
  return buildConfigs(
    resolveKeyRequirements,
    ALL_CURRENCY_DISTRIBUTIONS,
    CAPPED_CURRENCIES,
    DYNAMIC_DISTRIBUTIONS,
    MOD_WORLD_VALIDATORS,
    familyPriorityFor,
    emptyFraction,
    allocateEncounterSpread,
    MOD_REACHABILITY_SUPPORT,
    MOD_TOMB_TREASURE_RESOLVER,
    familyCapacityFor,
    MOD_SHOP_STOCK,
    MOD_RESERVED_TREASURE_INDICES,
    familyIsTrap,
    REGISTERED_MOD_IDS,
    resolveEncounterMeta,
    placeWorldWeb
  )
}
