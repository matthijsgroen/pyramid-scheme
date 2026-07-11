import type { SiteConfig, Tier } from "./types"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import { assembleFloor } from "../game/siteAssembler"
import { collectReachableKeys } from "../game/siteValidator"
import { hashString } from "../support/hashString"
import { TIER_UNLOCK_PERK_ID } from "../data/treasurePerks"

// The coarse reachability graph: "which floors/tombs/tiers are reachable given keys
// collected so far", computed on demand over the existing per-floor `collectReachableKeys`/
// `assembleFloor` — never re-deriving that logic. See
// docs/game-design/keys-and-locks-solver.md, "Two levels: a coarse world graph over an
// unchanged fine-grained one". Does not yet implement the worklist-driven placement loop
// (a later slice of the same backlog item) — this is the pure primitive that loop will call.

// One entry of a journey's SiteConfig[] — a single pyramid-level, or (for tombs) the
// tomb's one multi-floor site. Progressing between `levelIndex` values is plain sequential
// completion (an exterior puzzle, not a key), so it's outside this solver's scope; only
// floors within one site, and journeys/tiers themselves, are ever locked.
export type SiteRef = { journeyId: string; levelIndex: number }
export type FloorRef = SiteRef & { floorIndex: number }

export const floorKey = (ref: FloorRef): string => `${ref.journeyId}#${ref.levelIndex}#${ref.floorIndex}`

// Reachability only depends on gate/key structure, which the FloorConfig DSL fixes
// regardless of seed — the maze shape assembleFloor rolls per seed doesn't change which
// keys gate which transitions. Any deterministic seed is a representative instance.
const defaultSeedFor = (ref: SiteRef): number => hashString(`${ref.journeyId}:${ref.levelIndex}`)

// Reachable floor indices within one site, given already-held keys (plus any tombKey
// rewards the site's own reachable floors grant along the way — a tomb's treasure can be
// exactly the key that opens its own further gate, pyramid-interior-design.md §8).
//
// A later floor's entrance stairId isn't always hosted on the immediately preceding floor
// — buildSite.ts's ward-wing branches all anchor off the single last main floor, not a
// linear i→i+1 chain — so each newly-reachable floor is checked against every later floor
// still waiting for a host, not just its own array index.
export const reachableFloorsInSite = (
  ref: SiteRef,
  site: SiteConfig,
  ownedKeys: ReadonlySet<string>,
  seed: number = defaultSeedFor(ref)
): ReadonlySet<number> => {
  const siteId = `${ref.journeyId}:${ref.levelIndex}`
  const reachable = new Set<number>([0])
  let keys = new Set(ownedKeys)

  for (let i = 0; i < site.length; i++) {
    if (!reachable.has(i)) continue

    // worldGen's FloorConfig (this module's SiteConfig type) is a slightly looser mirror
    // of game/siteTypes.ts's — real authored data only ever assigns values the stricter
    // type accepts too, so this cast is safe (see the two files' own "mirrors" comments).
    const result = assembleFloor(siteId, site[i] as GameFloorConfig, seed + i)
    if (!result.success) continue

    const { keys: expandedKeys, reachable: reachableHere } = collectReachableKeys(
      result.grid,
      result.grid.entrancePos,
      keys
    )
    keys = expandedKeys

    for (let j = i + 1; j < site.length; j++) {
      if (reachable.has(j)) continue
      const entrance = site[j].entrance
      const stairId = typeof entrance === "object" ? entrance.stairId : undefined
      if (!stairId) {
        reachable.add(j) // no explicit pairing — not really chained, treat as unconditional
        continue
      }
      const target = result.grid.staircases[stairId]
      if (target && reachableHere.has(`${target[0]},${target[1]}`)) reachable.add(j)
    }
  }

  return reachable
}

// Global scope: starter is always unlocked; every other tier needs its TIER_UNLOCK_PERK_ID
// treasure held (data/treasurePerks.ts).
export const isTierUnlocked = (tier: Tier, ownedKeys: ReadonlySet<string>): boolean => {
  const perkId = TIER_UNLOCK_PERK_ID[tier]
  return tier === "starter" || (perkId != null && ownedKeys.has(perkId))
}

// Journey scope: enterable once its tier is unlocked and (for tombs) `piecesRequired` map
// pieces are held. Pyramids have no piecesRequired (pass 0) — tier unlock is the only gate.
export const isJourneyEnterable = (
  tier: Tier,
  ownedKeys: ReadonlySet<string>,
  piecesRequired: number,
  mapPiecesHeld: number
): boolean => isTierUnlocked(tier, ownedKeys) && mapPiecesHeld >= piecesRequired

export type JourneyMeta = { tier: Tier; piecesRequired: number }

export type ReachabilityResult = {
  reachableFloors: ReadonlySet<string>
  unlockedTiers: ReadonlySet<Tier>
}

const ALL_TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]

// The whole-world pass: every reachable floor of every enterable journey's sites, all
// against the SAME shared `ownedKeys` set — which is exactly what lets a key earned in one
// journey unlock a floor in a completely different one.
export const computeReachability = (
  allConfigs: Record<string, SiteConfig[]>,
  journeyMeta: Record<string, JourneyMeta>,
  ownedKeys: ReadonlySet<string>,
  mapPiecesHeld: ReadonlyMap<string, number>
): ReachabilityResult => {
  const unlockedTiers = new Set(ALL_TIERS.filter(t => isTierUnlocked(t, ownedKeys)))
  const reachableFloors = new Set<string>()

  for (const [journeyId, sites] of Object.entries(allConfigs)) {
    const meta = journeyMeta[journeyId]
    if (!meta) continue
    if (!isJourneyEnterable(meta.tier, ownedKeys, meta.piecesRequired, mapPiecesHeld.get(journeyId) ?? 0)) continue

    sites.forEach((site, levelIndex) => {
      const ref: SiteRef = { journeyId, levelIndex }
      for (const floorIndex of reachableFloorsInSite(ref, site, ownedKeys)) {
        reachableFloors.add(floorKey({ ...ref, floorIndex }))
      }
    })
  }

  return { reachableFloors, unlockedTiers }
}
