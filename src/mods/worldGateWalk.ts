import type { SiteConfig } from "@/worldGen/types"
import type { JourneyMeta } from "@/worldGen/reachability"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "@/worldGen/data"
import { journeyMetaFor, makeGateWalk, type GateWalk } from "@/worldGen/gateWalk"
import { mergeReachabilitySupport } from "@/worldGen/placeFragments"
import { ALL_CURRENCY_DISTRIBUTIONS } from "./allCurrencyDistributions"
import { resolveEncounterMeta, resolveKeyRequirements } from "./allFamilyMeta"
import { MOD_REACHABILITY_SUPPORT } from "./registeredMods"

/** The strict gate walk over a finished world, with every registered mod's currencies, support and realisations, on a
 * cache of its own: every floor is carved afresh from the configs given, so the walk reads the world that ships. Each
 * journey of the world is listed with its tier; one in no journey list is refused, since the walk could never enter it. */
export const worldGateWalk = (
  configs: Record<string, SiteConfig[]>
): { walk: GateWalk; journeyMeta: Record<string, JourneyMeta> } => {
  const known = journeyMetaFor(PYRAMID_JOURNEYS, TOMB_JOURNEYS)
  const journeyMeta = Object.fromEntries(
    Object.keys(configs).map(journeyId => {
      const meta = known[journeyId]
      if (!meta) throw new Error(`worldGateWalk: journey ${journeyId} is in the world but in no journey list.`)
      return [journeyId, meta]
    })
  )
  const walk = makeGateWalk({
    configs,
    journeyMeta,
    support: mergeReachabilitySupport(ALL_CURRENCY_DISTRIBUTIONS, MOD_REACHABILITY_SUPPORT),
    resolveRequirements: resolveKeyRequirements,
    resolveEncounter: resolveEncounterMeta,
  })
  return { walk, journeyMeta }
}
