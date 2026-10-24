import { buildConfigs } from "@/worldGen/configBuilder"
import type { SiteConfig } from "@/worldGen/types"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { worldWebs } from "@/game/webCatalogue"
import type { Web } from "@/game/webNotation"
import { pinWebFloors, placeWeb } from "@/worldGen/webPlacement"
import type { WebPlacement } from "@/worldGen/webPlacement"
import { carveWorldFloor } from "./carveWorldFloor"
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
} from "./registeredMods"

/** With no mod realising the web, a lock's outside inputs are open ground: nothing binds them, nothing shuts them. */
export const openLockInputs = (configs: Record<string, SiteConfig[]>) => {
  for (const sites of Object.values(configs))
    for (const site of sites)
      for (const floor of site)
        if (floor.locks)
          floor.locks = floor.locks.map(placed =>
            placed.lock.inputs?.length ? { ...placed, web: { inputs: {}, open: true as const } } : placed
          )
}

export type BuildWorldOptions = {
  /** The tier webs to place; the ones under src/game/locks by default. */
  webs?: readonly Web[]
  /** Handed each web as it was placed, for the checks run once the floors carry their pins. */
  onWebPlaced?: (placement: WebPlacement) => void
  /** The carve pins the web's floors are read at; the last bake's by default. */
  pins?: Readonly<Record<string, SiteConfig[]>>
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
          pinWebFloors(configs, options.pins ?? generatedWorldConfigs)
          for (const web of webs) options.onWebPlaced?.(placeWeb(web, configs, carveWorldFloor, toReward))
        }
      : toReward
        ? undefined
        : openLockInputs
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
