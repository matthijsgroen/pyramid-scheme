import type { SiteConfig, Tier, TreasureReward } from "./types"
import type { AssemblerResult, FloorConfig as GameFloorConfig } from "../game/siteTypes"
import type { ResolveKeyRequirements } from "../game/siteAssembler"
import { assembleFloor } from "../game/siteAssembler"
import { collectReachableKeys } from "../game/siteValidator"
import { hashString } from "../support/hashString"

// Every piece of currency knowledge reachability needs, injected by the caller (placeFragments,
// which assembles it from the registered mod currencies + the tomb-treasure mod's reachability
// support). Reachability itself names NO currency — not map pieces, not tomb keys, not the tier
// ladder. All four hooks default to "not mine" so a caller with no mods (or a test) still works:
// an unknown bucket thresholds at 1, an unrecognized reward harvests nothing, a journey has no
// entry lock, a tier has no unlock lock (so everything is reachable).
//   - thresholdFor:     a bucket's gate threshold (held count that satisfies it).
//   - bucketForReward:  which bucket a harvestable reward feeds (a mod maps its own reward type).
//   - journeyEntryLock: the (bucket, threshold) that gates ENTERING a journey — e.g. a tomb needs
//                       N of the map-piece currency. undefined = no currency lock (pyramids).
//   - tierUnlockBucket: the bucket whose possession unlocks a difficulty tier globally (the
//                       ladder). undefined = that tier has no lock (e.g. the first tier).
export type ReachabilitySupport = {
  thresholdFor?: (bucket: string) => number | undefined
  bucketForReward?: (reward: TreasureReward) => string | undefined
  journeyEntryLock?: (journeyId: string) => { bucket: string; threshold: number } | undefined
  tierUnlockBucket?: (tier: Tier) => string | undefined
}
const noSupport: ReachabilitySupport = {}

// No default resolver here — this module stays within src/worldGen/'s own dependency rules
// (data/, game/ only) same as assembleFloor itself never importing the real resolveEncounter.
// A caller wanting real key-requirement gating (e.g. a future placement script) passes one
// in, built from src/mods/allFamilyMeta.ts.
const noKeyRequirements: ResolveKeyRequirements = () => undefined

// The coarse reachability graph: "which floors/tombs/tiers are reachable given keys
// collected so far", computed on demand over the existing per-floor `collectReachableKeys`/
// `assembleFloor` — never re-deriving that logic. See
// docs/game-design/keys-and-locks-solver.md, "Two levels: a coarse world graph over an
// unchanged fine-grained one". Does not yet implement the worklist-driven placement loop
// (a later slice of the same backlog item) — this is the pure primitive that loop will call.
//
// One currency model, not three: a tomb-key/tier-unlock perk, a map piece, and a hieroglyph
// fragment are all "held instances of currency bucket X", the doc's own framing ("all the
// same shape to it"). Every lock — a gate/tableau's requiredKeyId(s), a tier unlock, a
// journey's entry threshold — reduces to one check: held count of bucket X >= that bucket's
// own threshold. The thresholds are all mod-supplied (`support.thresholdFor`): tomb-keys/
// tier-unlock perks default to 1 (own it once, done); hieroglyphs threshold at their fragment
// count; a journey's entry threshold rides `journeyEntryLock`, not this map. `OwnedCounts` is
// the one input type this whole module takes; `deriveOwnedFacts` is the one place raw counts
// become the booleans the fine per-floor BFS (siteValidator.ts, genuinely unchanged — every
// room-level check there is threshold-1 by contract) actually consumes.
export type OwnedCounts = ReadonlyMap<string, number>

// A bucket's gate threshold — entirely mod-supplied; an unclaimed bucket (a tomb-key/tier-unlock
// perk) is threshold-1 (own it once). Core names no currency here.
const thresholdFor = (id: string, support: ReachabilitySupport): number => support.thresholdFor?.(id) ?? 1

// Bounded to whatever's actually been recorded in `counts` (a handful of perks/currencies/
// tombs at most), not the whole universe of possible bucket ids.
export const deriveOwnedFacts = (counts: OwnedCounts, support: ReachabilitySupport = noSupport): Set<string> =>
  new Set([...counts.keys()].filter(id => (counts.get(id) ?? 0) >= thresholdFor(id, support)))

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

// Grid topology (gate/key structure, room layout) depends only on (siteId, floorIndex,
// seed), never on which keys are currently owned — assembleFloor is deterministic given
// those inputs. A worklist calling computeReachability repeatedly (once per placement, see
// docs/game-design/keys-and-locks-solver.md's placement loop) would otherwise re-run full
// maze assembly for every reachable floor on every single call — for a few hundred floors
// across dozens of placements, that's tens of thousands of redundant assemblies. Callers
// that drive such a loop create ONE cache and pass it through every call; each call still
// re-runs the (cheap) fine-grained BFS with whatever `ownedFacts` it has that round.
export type FloorAssemblyCache = Map<string, AssemblerResult>
export const createFloorAssemblyCache = (): FloorAssemblyCache => new Map()

export type SiteReachability = {
  floors: ReadonlySet<number>
  // tombKey / map-piece / hieroglyph-fragment rewards found within this site's own reachable
  // rooms. The fine BFS's own fixed point (collectReachableKeys, below) already resolves a
  // tombKey WITHIN this one site (e.g. a tomb's own treasure opening its own next floor) —
  // but that resolution is local to this function call and never reaches computeReachability's
  // OUTER cross-journey pass on its own. A tier-unlock treasure granted by one journey's tomb
  // gating a DIFFERENT journey's tier check is exactly the "backward and forward" propagation
  // the doc's worked example describes — it only happens if tombKey facts are harvested here
  // too, same as map pieces/hieroglyphs, so a caller's own fixed point (computeReachability's
  // `harvestedCounts` aggregation) can fold them back into `ownedCounts` for its next pass.
  harvestedCounts: ReadonlyMap<string, number>
  // Bucket ids hit at this site's reachable frontier but not yet satisfied — a gate's
  // requiredKeyId, a tableau's requiredKeyIds. These are the worklist's discovered locks
  // (keys-and-locks-solver.md, "Structure, then loot": the wish was always in the
  // structure, this is the walk noticing it isn't satisfiable yet).
  discoveredLocks: ReadonlySet<string>
}

// Reachable floor indices within one site, given already-held facts (plus any tombKey
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
  ownedFacts: ReadonlySet<string>,
  seed: number = defaultSeedFor(ref),
  resolveRequirements: ResolveKeyRequirements = noKeyRequirements,
  cache?: FloorAssemblyCache,
  support: ReachabilitySupport = noSupport
): SiteReachability => {
  const siteId = `${ref.journeyId}:${ref.levelIndex}`
  const reachable = new Set<number>([0])
  let keys = new Set(ownedFacts)
  const harvestedCounts = new Map<string, number>()
  const harvest = (id: string) => harvestedCounts.set(id, (harvestedCounts.get(id) ?? 0) + 1)
  const discoveredLocks = new Set<string>()

  for (let i = 0; i < site.length; i++) {
    if (!reachable.has(i)) continue

    // worldGen's FloorConfig (this module's SiteConfig type) is a slightly looser mirror
    // of game/siteTypes.ts's — real authored data only ever assigns values the stricter
    // type accepts too, so this cast is safe (see the two files' own "mirrors" comments).
    const cacheKey = `${siteId}#${i}#${seed + i}`
    let result = cache?.get(cacheKey)
    if (!result) {
      result = assembleFloor(siteId, site[i] as GameFloorConfig, seed + i, undefined, {
        resolveKeyRequirements: resolveRequirements,
        floorRef: { journeyId: ref.journeyId, floorIndex: i },
      })
      cache?.set(cacheKey, result)
    }
    if (!result.success) continue

    const {
      keys: expandedKeys,
      reachable: reachableHere,
      blockedRequirements,
    } = collectReachableKeys(result.grid, result.grid.entrancePos, keys)
    keys = expandedKeys
    for (const id of blockedRequirements) discoveredLocks.add(id)

    for (let r = 0; r < result.grid.rows; r++) {
      for (let c = 0; c < result.grid.cols; c++) {
        const cell = result.grid.cells[r][c]
        if (cell.type !== "room" || !reachableHere.has(`${r},${c}`)) continue
        // Every harvestable reward routes through the injected support — a mod maps its own
        // reward type to its own bucket (map piece → mapPiece:<tomb>, tomb key → its keyId,
        // hieroglyph fragment → hieroglyph:<id>). Core names none.
        if (cell.reward) {
          const bucket = support.bucketForReward?.(cell.reward)
          if (bucket) harvest(bucket)
        }
      }
    }

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

  return { floors: reachable, harvestedCounts, discoveredLocks }
}

// Global scope: a tier is unlocked when it has no unlock lock (e.g. the first tier), or when the
// mod-supplied unlock bucket for it is held. Core names no specific tier-unlock key — the ladder
// is `support.tierUnlockBucket`'s data (see ReachabilitySupport).
export const isTierUnlocked = (tier: Tier, ownedFacts: ReadonlySet<string>, support: ReachabilitySupport): boolean => {
  const bucket = support.tierUnlockBucket?.(tier)
  return bucket == null || ownedFacts.has(bucket)
}

// A journey carries only its tier; whether entering it needs a currency threshold (a tomb's map
// pieces) is `support.journeyEntryLock`'s data, not a field here — core names no currency.
export type JourneyMeta = { tier: Tier }

export type ReachabilityResult = {
  reachableFloors: ReadonlySet<string>
  unlockedTiers: ReadonlySet<Tier>
  // Map-piece / hieroglyph-fragment instances found within the reachable area this call
  // computed, aggregated across every journey — a caller driving a worklist (repeatedly
  // growing `ownedCounts` and calling again) merges these in for its next pass; see
  // `deriveOwnedFacts` above for how a raw count becomes a boolean fact once thresholded.
  harvestedCounts: ReadonlyMap<string, number>
  // Bucket ids discovered as blocking somewhere reachable this pass — a room-scoped gate/
  // tableau requirement, or a journey-scoped piecesRequired shortfall for a tomb whose tier
  // is unlocked but isn't enterable yet. The worklist's queue is seeded and grown from this.
  discoveredLocks: ReadonlySet<string>
}

const ALL_TIERS: Tier[] = ["starter", "junior", "expert", "master", "wizard"]

// The whole-world pass: every reachable floor of every enterable journey's sites, all
// against the SAME shared `ownedCounts` snapshot — which is exactly what lets a key earned
// in one journey unlock a floor in a completely different one. A single call is a snapshot,
// not a fixed point — cross-journey/cross-tier propagation (the doc's "backward and forward"
// worked example) happens by a caller repeatedly calling this with a growing `ownedCounts`
// (fed by this call's own `harvestedCounts`), not within one call itself.
export const computeReachability = (
  allConfigs: Record<string, SiteConfig[]>,
  journeyMeta: Record<string, JourneyMeta>,
  ownedCounts: OwnedCounts,
  resolveRequirements: ResolveKeyRequirements = noKeyRequirements,
  // Assumed constant for the cache's whole lifetime — a cache reused across calls with a
  // DIFFERENT resolveRequirements would return stale grids built under the old one.
  cache?: FloorAssemblyCache,
  support: ReachabilitySupport = noSupport
): ReachabilityResult => {
  const ownedFacts = deriveOwnedFacts(ownedCounts, support)
  const unlockedTiers = new Set(ALL_TIERS.filter(t => isTierUnlocked(t, ownedFacts, support)))
  const reachableFloors = new Set<string>()
  const harvestedCounts = new Map<string, number>()
  const addHarvested = (id: string, count: number) => harvestedCounts.set(id, (harvestedCounts.get(id) ?? 0) + count)
  const discoveredLocks = new Set<string>()

  for (const [journeyId, sites] of Object.entries(allConfigs)) {
    const meta = journeyMeta[journeyId]
    if (!meta) continue
    if (!isTierUnlocked(meta.tier, ownedFacts, support)) continue // tier itself not reached yet — not a frontier lock here
    // Journey-scoped entry lock (mod-supplied): e.g. a tomb needs N of the map-piece currency.
    // Tier reached but the threshold unmet → a genuine discovered lock, distinct from a
    // room-scoped requiredKeyId. Pyramids have no entry lock (undefined) and always pass.
    const entryLock = support.journeyEntryLock?.(journeyId)
    if (entryLock && (ownedCounts.get(entryLock.bucket) ?? 0) < entryLock.threshold) {
      discoveredLocks.add(entryLock.bucket)
      continue
    }

    sites.forEach((site, levelIndex) => {
      const ref: SiteRef = { journeyId, levelIndex }
      const siteResult = reachableFloorsInSite(ref, site, ownedFacts, undefined, resolveRequirements, cache, support)
      for (const floorIndex of siteResult.floors) reachableFloors.add(floorKey({ ...ref, floorIndex }))
      for (const [id, count] of siteResult.harvestedCounts) addHarvested(id, count)
      for (const id of siteResult.discoveredLocks) discoveredLocks.add(id)
    })
  }

  return { reachableFloors, unlockedTiers, harvestedCounts, discoveredLocks }
}
