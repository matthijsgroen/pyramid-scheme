import type { SiteConfig, Tier, TreasureReward } from "./types"
import type { AssemblerResult, FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import type { ResolveEncounter, ResolveKeyRequirements } from "../game/siteAssembler"
import { assembleFloor, defaultResolveEncounter } from "../game/siteAssembler"
import type { ResolveOneWayRealisation } from "../game/oneWayRealisation"
import type { ResolvePassageRealisation } from "../game/passageRealisation"
import type { ResolveRegionBarrierRealisation } from "../game/regionBarrierRealisation"
import { collectReachableKeys, reachableFrom } from "../game/siteValidator"
import { mechanismGatesOf } from "../game/mechanismDoors"
import { hashString } from "../support/hashString"

// Every piece of currency knowledge reachability needs, injected by the caller (placeFragments,
// which assembles it from the registered mod currencies + every mod's reachability support).
// Reachability itself names NO currency — not map pieces, not tomb keys, not the tier ladder.
// Every hook defaults to "not mine" so a caller with no mods (or a test) still works: an unknown
// bucket thresholds at 1, an unrecognized reward harvests nothing, a journey has no entry lock,
// a tier has no unlock group (so everything is reachable).
//   - thresholdFor:      a bucket's gate threshold (held count that satisfies it).
//   - bucketForReward:   which bucket a harvestable reward feeds (a mod maps its own reward type).
//   - journeyEntryLocks: the (bucket, threshold) pairs that gate ENTERING a journey — e.g. a tomb
//                        needs N of the map-piece currency. Every lock must hold: each mod adds its
//                        own requirement, and no mod's lock stands in for another's. Empty = open.
//   - tierUnlockGroups:  the groups of buckets that unlock a difficulty tier globally (the ladder).
//                        AND across groups, OR within a group: every group needs one held bucket,
//                        so a mod offers alternatives within its own group but never waives another
//                        mod's. No groups = that tier has no lock (e.g. the first tier).
export type JourneyEntryLock = { bucket: string; threshold: number }
export type ReachabilitySupport = {
  thresholdFor?: (bucket: string) => number | undefined
  /** Binds each one-way to its realisation, so a floor binding none is refused here as it is in play. */
  resolveOneWay?: ResolveOneWayRealisation
  /** Binds each region barrier to its realisation, refused here as in play when it has none. */
  resolveRegionBarrier?: ResolveRegionBarrierRealisation
  /** Dresses each gate empty hands alone open as the passage it names, as in play. */
  resolvePassage?: ResolvePassageRealisation
  bucketForReward?: (reward: TreasureReward) => string | undefined
  /** Further buckets one reward counts in besides its own: a web activator counts once in each pot it is a lever of. */
  alsoHarvests?: (reward: TreasureReward) => string[]
  /** Facts a held count stands for besides its bucket: a pot holding n of its levers holds each of its first n stops. */
  factsForCount?: (bucket: string, count: number) => string[]
  journeyEntryLocks?: (journeyId: string) => readonly JourneyEntryLock[]
  tierUnlockGroups?: (tier: Tier) => readonly (readonly string[])[]
  /**
   * The fact a hidden section needs: its cells are ground to the strict walk only while this fact is held, and a
   * walk that stops at one discovers the fact as a lock. Absent, nothing can reveal a hidden section in play, so
   * the strict walk never enters one and discovers no lock for it. The permissive walk always walks them open: it
   * answers what is ever obtainable.
   */
  hiddenRequirement?: () => string
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
// count; a journey's entry thresholds ride `journeyEntryLocks`, not this map. `OwnedCounts` is
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
  new Set([
    ...[...counts.keys()].filter(id => (counts.get(id) ?? 0) >= thresholdFor(id, support)),
    ...[...counts].flatMap(([id, count]) => support.factsForCount?.(id, count) ?? []),
  ])

// One entry of a journey's SiteConfig[] — a single pyramid-level, or (for tombs) the
// tomb's one multi-floor site. Progressing between `levelIndex` values is plain sequential
// completion (an exterior puzzle, not a key), so it's outside this solver's scope; only
// floors within one site, and journeys/tiers themselves, are ever locked.
export type SiteRef = { journeyId: string; levelIndex: number }
export type FloorRef = SiteRef & { floorIndex: number }

export const floorKey = (ref: FloorRef): string => `${ref.journeyId}#${ref.levelIndex}#${ref.floorIndex}`

// The seed a floor that carries no `seed` of its own is carved at. Every floor of a built world carries the
// seed its layout was picked at (configBuilder.ts, `pickLayout`), and that pin is what the walk carves.
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
  /** The floors each discovered lock stands on: the floor whose walk ran into it. */
  lockFloors: ReadonlyMap<string, ReadonlySet<number>>
  // Every reward sitting in this site's reachable rooms, verbatim and un-bucketed — a room's own
  // `reward` plus each piece of a shop's `stock`. `harvestedCounts` above answers "which locks does
  // the walk now satisfy", so it only sees rewards some currency claims a bucket for; this answers
  // "how much of a thing is out there at all", which is what a collection's target count is
  // measured against. Core reads no reward type here — a consumer counts its own.
  reachableRewards: readonly TreasureReward[]
  /** Whether the site's way out is reached: the exit of the floor its main path leaves by. */
  exit: boolean
}

const isHidden = (grid: FloorGrid, at: string): boolean => {
  const [r, c] = at.split(",").map(Number)
  const cell = grid.cells[r][c]
  return (cell.type === "room" || cell.type === "corridor") && !!cell.hidden
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
  support: ReachabilitySupport = noSupport,
  // Real family resolution (reEnterable included) — a caller wanting an authored switch's
  // reEnterable check to answer correctly (rather than defaultResolveEncounter's blanket "no")
  // passes one in, built from src/mods/allFamilyMeta.ts's resolveEncounterMeta.
  resolveEncounter: ResolveEncounter = defaultResolveEncounter,
  // The permissive bracket (siteValidator.ts's `reachableFrom`): authored doors stand open, so the
  // walk answers "is this ever obtainable" rather than "is it open right now".
  authoredKeysHeld = false,
  // A fact the walk never holds, not even from a key standing in reach on this site (the gate walk).
  withheld?: string
): SiteReachability => {
  const siteId = `${ref.journeyId}:${ref.levelIndex}`
  const reachable = new Set<number>([0])
  let keys = new Set(ownedFacts)
  if (withheld !== undefined) keys.delete(withheld)
  const harvestedCounts = new Map<string, number>()
  const harvest = (id: string) => harvestedCounts.set(id, (harvestedCounts.get(id) ?? 0) + 1)
  const discoveredLocks = new Set<string>()
  const lockFloors = new Map<string, Set<number>>()
  const discover = (id: string, floorIndex: number) => {
    discoveredLocks.add(id)
    lockFloors.set(id, (lockFloors.get(id) ?? new Set()).add(floorIndex))
  }
  const reachableRewards: TreasureReward[] = []
  const harvestReward = (reward: TreasureReward) => {
    const bucket = support.bucketForReward?.(reward)
    if (bucket) harvest(bucket)
    for (const also of support.alsoHarvests?.(reward) ?? []) harvest(also)
    reachableRewards.push(reward)
  }
  const exitFloor = site.findIndex(floor => floor.exitOrStaircase === "exit")
  let exit = false
  const hiddenRequirement = support.hiddenRequirement?.()

  for (let i = 0; i < site.length; i++) {
    if (!reachable.has(i)) continue

    // worldGen's FloorConfig (this module's SiteConfig type) is a slightly looser mirror
    // of game/siteTypes.ts's — real authored data only ever assigns values the stricter
    // type accepts too, so this cast is safe (see the two files' own "mirrors" comments).
    // The floor is carved at its layout's pin, where it carries one: the floor the player walks. The cache is keyed
    // on the seed and packing carved at, so a floor re-pinned between two calls is never read off the old carve.
    const floorSeed = site[i].seed ?? seed + i
    const cacheKey = `${siteId}#${i}#${floorSeed}#${site[i].packing ?? ""}`
    let result = cache?.get(cacheKey)
    if (!result) {
      // Carved under the journey id, as play and the bake carve it: ids and hashes inside the floor derive from it.
      result = assembleFloor(ref.journeyId, site[i] as GameFloorConfig, floorSeed, resolveEncounter, {
        resolveKeyRequirements: resolveRequirements,
        floorRef: { journeyId: ref.journeyId, levelIndex: ref.levelIndex, floorIndex: i },
        ...(support.resolveOneWay ? { resolveOneWay: support.resolveOneWay } : {}),
        ...(support.resolveRegionBarrier ? { resolveRegionBarrier: support.resolveRegionBarrier } : {}),
        ...(support.resolvePassage ? { resolvePassage: support.resolvePassage } : {}),
      })
      cache?.set(cacheKey, result)
    }
    // A floor that won't assemble is a data bug, never an unreachable floor: skipping it would place no
    // content behind it and report nothing. So say so and stop. A floor carrying its layout's pin is
    // carved here as the runtime carves it; one carrying none is carved at `defaultSeedFor`, which
    // says nothing about what players get.
    if (!result.success) {
      throw new Error(
        `Floor ${floorKey({ ...ref, floorIndex: i })} cannot be assembled (seed ${floorSeed}): ${JSON.stringify(
          result.reasons
        )}`
      )
    }

    const hiddenOpen = authoredKeysHeld || (hiddenRequirement !== undefined && keys.has(hiddenRequirement))
    const mechanismGates = mechanismGatesOf(result.grid)
    const {
      keys: expandedKeys,
      reachable: reachableHere,
      blockedRequirements,
    } = collectReachableKeys(result.grid, result.grid.entrancePos, keys, {
      authoredKeysHeld,
      mechanismGates,
      withheld,
      hiddenOpen,
    })
    keys = expandedKeys
    // The hidden requirement is a lock here when holding it would let this walk onto a hidden cell.
    if (
      !hiddenOpen &&
      hiddenRequirement !== undefined &&
      [...reachableFrom(result.grid, result.grid.entrancePos, keys, { mechanismGates })].some(
        at => isHidden(result.grid, at) && !reachableHere.has(at)
      )
    )
      discover(hiddenRequirement, i)
    if (i === exitFloor && reachableHere.has(`${result.grid.exitPos[0]},${result.grid.exitPos[1]}`)) exit = true
    // A gate a mechanism of this floor owns is never blocking here (the walk takes the floor's own lock as
    // sound), so only a key gate, or a floor key such a gate also lists, is a lock the worklist can see.
    for (const id of blockedRequirements) discover(id, i)

    for (let r = 0; r < result.grid.rows; r++) {
      for (let c = 0; c < result.grid.cols; c++) {
        const cell = result.grid.cells[r][c]
        if (cell.type !== "room" || !reachableHere.has(`${r},${c}`)) continue
        // Every harvestable reward routes through the injected support — a mod maps its own
        // reward type to its own bucket (map piece → mapPiece:<tomb>, tomb key → its keyId,
        // hieroglyph fragment → hieroglyph:<id>). Core names none.
        //
        // A room's own reward and every piece of a shop's stock are both loot standing in a
        // reachable room, so both are harvested and both land in `reachableRewards`. A stock piece
        // counts as held the moment its shop is reached: whether the player can afford it is the
        // economy guard's question (it owns money), not this walk's. Only harvesting reads buckets;
        // the rewards list stays raw for whoever counts its own kind.
        if (cell.reward) harvestReward(cell.reward)
        for (const stocked of cell.stock ?? []) if (stocked) harvestReward(stocked)
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

  return { floors: reachable, harvestedCounts, discoveredLocks, lockFloors, reachableRewards, exit }
}

/**
 * A JOURNEY WHOSE PYRAMIDS ARE WALKED IN ORDER: pyramid N+1 is entered only once pyramid N's way out is reached, which
 * is what the journey's `levelNr` cursor makes true in play. Asked of the journeys a web lays doors in, the only ones
 * whose way out a key held from elsewhere can shut.
 */
export const isOrderedJourney = (sites: readonly SiteConfig[]): boolean =>
  sites.some(site =>
    site.some(
      floor => (floor.webDoors?.length ?? 0) > 0 || (floor.locks ?? []).some(placed => placed.web && !placed.web.open)
    )
  )

// Global scope: a tier is unlocked when every one of its mod-supplied groups has a held bucket.
// AND across groups (each contributing mod's requirement must hold), OR within a group (a player
// who finds any one of a tomb's several unlock treasures has that requirement met). No groups
// (e.g. the first tier) = open. Core names no specific tier-unlock key — the ladder is
// `support.tierUnlockGroups`'s data (see ReachabilitySupport).
export const unmetTierGroups = (
  tier: Tier,
  ownedFacts: ReadonlySet<string>,
  support: ReachabilitySupport
): (readonly string[])[] =>
  (support.tierUnlockGroups?.(tier) ?? []).filter(group => !group.some(b => ownedFacts.has(b)))

export const isTierUnlocked = (tier: Tier, ownedFacts: ReadonlySet<string>, support: ReachabilitySupport): boolean =>
  unmetTierGroups(tier, ownedFacts, support).length === 0

// A journey carries only its tier; whether entering it needs a currency threshold (a tomb's map
// pieces) is `support.journeyEntryLocks`'s data, not a field here — core names no currency.
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
  /** Where each discovered lock stands: `<journey> level <n> floor <f>`, or `<journey> entrance` for an entry lock. */
  discoveredAt: ReadonlyMap<string, readonly string[]>
  // Every reward standing in the reachable area this call computed, across every journey — see
  // SiteReachability.reachableRewards. A collection's target count is checked against this: a
  // count of a kind, not a count of the locks it opens.
  reachableRewards: readonly TreasureReward[]
  /** The sites whose way out is reached, as `${journeyId}#${levelIndex}`. */
  exitsReached: ReadonlySet<string>
  /** The journeys walked: tier open and every entry lock held. */
  enteredJourneys: ReadonlySet<string>
  /** The walked sites with a way out the walk never reaches, as `<journey> level <n>`. */
  sitesNeverLeft: readonly string[]
}

// The tiers bottom to top: the ladder a player climbs, each tier opened from the one below.
export const TIER_LADDER: readonly Tier[] = ["starter", "junior", "expert", "master", "wizard"]

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
  support: ReachabilitySupport = noSupport,
  resolveEncounter: ResolveEncounter = defaultResolveEncounter,
  // The permissive bracket, passed down to every site's walk — see reachableFloorsInSite.
  authoredKeysHeld = false,
  // A fact never held this call, whatever the counts or the sites' own keys say (the gate walk).
  withheld?: string
): ReachabilityResult => {
  const ownedFacts = deriveOwnedFacts(ownedCounts, support)
  if (withheld !== undefined) ownedFacts.delete(withheld)
  const enteredJourneys = new Set<string>()
  const unlockedTiers = new Set(TIER_LADDER.filter(t => isTierUnlocked(t, ownedFacts, support)))
  const reachableFloors = new Set<string>()
  const harvestedCounts = new Map<string, number>()
  const addHarvested = (id: string, count: number) => harvestedCounts.set(id, (harvestedCounts.get(id) ?? 0) + count)
  const discoveredLocks = new Set<string>()
  const discoveredAt = new Map<string, string[]>()
  const discoverAt = (id: string, place: string) => {
    discoveredLocks.add(id)
    discoveredAt.set(id, [...(discoveredAt.get(id) ?? []), place])
  }
  const reachableRewards: TreasureReward[] = []
  const exitsReached = new Set<string>()
  const sitesNeverLeft: string[] = []

  for (const [journeyId, sites] of Object.entries(allConfigs)) {
    const meta = journeyMeta[journeyId]
    if (!meta) continue
    if (!isTierUnlocked(meta.tier, ownedFacts, support)) continue // tier itself not reached yet — not a frontier lock here
    // Journey-scoped entry locks (mod-supplied): e.g. a tomb needs N of the map-piece currency.
    // Every lock must hold. Tier reached but a threshold unmet → a genuine discovered lock, distinct
    // from a room-scoped requiredKeyId; each unmet one is discovered, so the worklist sees them all
    // at once. A journey with no entry locks (a pyramid) always passes.
    const unmetEntry = (support.journeyEntryLocks?.(journeyId) ?? []).filter(
      lock => (ownedCounts.get(lock.bucket) ?? 0) < lock.threshold
    )
    if (unmetEntry.length > 0) {
      for (const lock of unmetEntry) discoverAt(lock.bucket, `${journeyId} entrance`)
      continue
    }

    enteredJourneys.add(journeyId)
    const ordered = isOrderedJourney(sites)
    let open = true
    sites.forEach((site, levelIndex) => {
      if (!open) return
      const ref: SiteRef = { journeyId, levelIndex }
      const siteResult = reachableFloorsInSite(
        ref,
        site,
        ownedFacts,
        undefined,
        resolveRequirements,
        cache,
        support,
        resolveEncounter,
        authoredKeysHeld,
        withheld
      )
      for (const floorIndex of siteResult.floors) reachableFloors.add(floorKey({ ...ref, floorIndex }))
      for (const [id, count] of siteResult.harvestedCounts) addHarvested(id, count)
      for (const [id, floors] of siteResult.lockFloors)
        for (const floorIndex of floors) discoverAt(id, `${journeyId} level ${levelIndex + 1} floor ${floorIndex}`)
      reachableRewards.push(...siteResult.reachableRewards)
      if (siteResult.exit) exitsReached.add(`${journeyId}#${levelIndex}`)
      else if (site.some(floor => floor.exitOrStaircase === "exit"))
        sitesNeverLeft.push(`${journeyId} level ${levelIndex + 1}`)
      if (ordered && !siteResult.exit) open = false
    })
  }

  return {
    reachableFloors,
    unlockedTiers,
    harvestedCounts,
    discoveredLocks,
    discoveredAt,
    reachableRewards,
    exitsReached,
    enteredJourneys,
    sitesNeverLeft,
  }
}
