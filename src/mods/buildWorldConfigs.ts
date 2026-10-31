import { buildConfigs, type PickLayout } from "@/worldGen/configBuilder"
import type { SiteConfig } from "@/worldGen/types"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { worldWebs } from "@/game/webCatalogue"
import type { Web } from "@/game/webNotation"
import { placeWeb } from "@/worldGen/webPlacement"
import type { WebPlacement } from "@/worldGen/webPlacement"
import { carveWorldFloor } from "./carveWorldFloor"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
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
  refuseModAuthoringProblems,
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

/** The layout a baked world shipped with: each floor takes the `seed` and `packing` the same floor carries in `baked`,
 * and a floor `baked` lacks takes its address's seed, so every floor is pinned.
 * Every build but the bake's builds on it, so what it checks is the world that ships. */
export const pinsFrom =
  (baked: Readonly<Record<string, SiteConfig[]>> = generatedWorldConfigs): PickLayout =>
  configs => {
    for (const [journeyId, sites] of Object.entries(configs))
      sites.forEach((site, levelIndex) =>
        site.forEach((floor, floorIndex) => {
          const pinned = baked[journeyId]?.[levelIndex]?.[floorIndex]
          // A floor the baked world does not have is pinned at the seed its address gives it, the one play carves
          // an unstamped floor at, so the walk and play never read two layouts of it.
          floor.seed =
            pinned?.seed ??
            floor.seed ??
            floorAssemblySeed(persistentInteriorSeed(journeyId), levelIndex + 1, floorIndex)
          if (pinned?.packing !== undefined) floor.packing = pinned.packing
          // Where its side paths stand is part of the picked layout: without it the floor carves another shape.
          if (pinned) {
            if (pinned.outsideLock) floor.outsideLock = pinned.outsideLock
            else delete floor.outsideLock
            if (pinned.corridorsTakeTwo) floor.corridorsTakeTwo = true
            else delete floor.corridorsTakeTwo
          }
        })
      )
  }

export type BuildWorldOptions = {
  /** Picks every floor's layout before any loot is placed: the bake's carve search, or `pinsFrom` a baked world. */
  pickLayout?: PickLayout
  /** The tier webs to place; the ones under src/game/locks by default. */
  webs?: readonly Web[]
  /** Handed each web as it was placed, for the checks run on the final floors. */
  onWebPlaced?: (placement: WebPlacement) => void
}

/** The world as the spec builds it with every registered mod, on the layout `pickLayout` picks, refused first when a
 * mod reports a problem with its own tables. A web is placed only
 * where a registered mod realises its activators; where none does, a lock's outside inputs are opened before the
 * layout is picked, since how a lock compiles is structure. */
export const buildWorldConfigs = (
  emptyFraction: number,
  options: BuildWorldOptions = {}
): Record<string, SiteConfig[]> => {
  refuseModAuthoringProblems()
  const webs = options.webs ?? worldWebs()
  const toReward = MOD_WEB_ACTIVATOR
  const placeWorldWeb =
    toReward && webs.length > 0
      ? (configs: Record<string, SiteConfig[]>) => {
          for (const web of webs) options.onWebPlaced?.(placeWeb(web, configs, carveWorldFloor, toReward))
        }
      : undefined
  const { pickLayout } = options
  const layout: PickLayout | undefined = toReward
    ? pickLayout
    : configs => {
        openLockInputs(configs)
        pickLayout?.(configs)
      }
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
    placeWorldWeb,
    { pickLayout: layout }
  )
}
