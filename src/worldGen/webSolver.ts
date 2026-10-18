// THE WORLD SOLVER ON THE WEB'S JOURNEYS (docs/instructions/sand-pyramid.md, "What the world solver needs"): the carved
// floors walked with only the keys the web hands out, each journey's pyramids in order, and the answer held against the
// web walk's. The web walk is the designer's check; this is the proof on the floors the player will walk.
import type { ResolveEncounter, ResolveKeyRequirements } from "../game/siteAssembler"
import { webKey } from "../game/webLine"
import type { SiteConfig } from "./types"
import { computeReachability, createFloorAssemblyCache } from "./reachability"
import type { JourneyMeta, ReachabilitySupport } from "./reachability"
import { webJourneysOf } from "./webPlacement"

/** What the solver reaches: the activators it takes, and the pyramids (`w3p1`) whose way out it reaches. */
export type WebSolve = { activators: ReadonlySet<string>; pyramids: ReadonlySet<string> }

/**
 * THE SOLVER'S CLOSURE OVER THE WEB'S JOURNEYS: no key from outside the web is held (no ward key, no tier, no map
 * piece), what a floor's own rooms and chests give is, and each activator reached counts toward its keys and its pots
 * until nothing more is reached.
 */
export const solveWeb = (
  configs: Record<string, SiteConfig[]>,
  activators: readonly string[],
  support: ReachabilitySupport,
  resolveRequirements?: ResolveKeyRequirements,
  resolveEncounter?: ResolveEncounter
): WebSolve => {
  const journeys = webJourneysOf(configs)
  const webConfigs = Object.fromEntries(journeys.map(([, id]) => [id, configs[id]]))
  const meta: Record<string, JourneyMeta> = Object.fromEntries(journeys.map(([, id]) => [id, { tier: "wizard" }]))
  // Only what the web's keys are made of: every other currency is held by no one.
  const webOnly: ReachabilitySupport = {
    bucketForReward: support.bucketForReward,
    alsoHarvests: support.alsoHarvests,
    factsForCount: support.factsForCount,
  }
  const owned = new Map<string, number>()
  const cache = createFloorAssemblyCache()
  for (;;) {
    const reach = computeReachability(
      webConfigs,
      meta,
      owned,
      resolveRequirements,
      cache,
      webOnly,
      resolveEncounter,
      true
    )
    let grew = false
    for (const [id, count] of reach.harvestedCounts)
      if ((owned.get(id) ?? 0) < count) {
        owned.set(id, count)
        grew = true
      }
    if (grew) continue
    const number = new Map(journeys.map(([n, id]) => [id, n]))
    return {
      activators: new Set(activators.filter(name => (owned.get(webKey(name)) ?? 0) > 0)),
      pyramids: new Set(
        [...reach.exitsReached].flatMap(site => {
          const [id, level] = site.split("#")
          return number.has(id) ? [`w${number.get(id)}p${Number(level) + 1}`] : []
        })
      ),
    }
  }
}

/** Every way the web walk and the solver disagree: an activator one takes and the other never reaches, a pyramid one
 * finishes and the other never leaves. Empty when they agree. */
export const webAgreement = (
  walked: { activators: readonly string[]; pyramids: readonly string[] },
  solved: WebSolve,
  activators: readonly string[],
  pyramids: readonly string[]
): string[] => [
  ...activators.flatMap(name => {
    const [walk, solve] = [walked.activators.includes(name), solved.activators.has(name)]
    if (walk === solve) return []
    return [
      walk
        ? `${name}: the web walk takes it, the solver never reaches it on the carved floors`
        : `${name}: the solver reaches it, the web walk never does`,
    ]
  }),
  ...pyramids.flatMap(name => {
    const [walk, solve] = [walked.pyramids.includes(name), solved.pyramids.has(name)]
    if (walk === solve) return []
    return [
      walk
        ? `${name}: the web walk finishes it, the solver never reaches its way out`
        : `${name}: the solver reaches its way out, the web walk never finishes it`,
    ]
  }),
]
