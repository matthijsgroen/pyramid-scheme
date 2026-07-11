import type { SiteConfig, Tier } from "./types"
import type { FloorConfig as GameFloorConfig } from "../game/siteTypes"
import type { ResolveKeyRequirements } from "../game/siteAssembler"
import { assembleFloor } from "../game/siteAssembler"
import { collectReachableKeys } from "../game/siteValidator"
import { hashString } from "../support/hashString"
import { TIER_UNLOCK_PERK_ID } from "../data/treasurePerks"
import { HIEROGLYPH_REQUIRED } from "./data"

// No default resolver here — this module stays within src/worldGen/'s own dependency rules
// (data/, game/ only) same as assembleFloor itself never importing the real resolveEncounter.
// A caller wanting real key-requirement gating (e.g. a future placement script) passes one
// in, built from src/mods/allKeyRequirementResolvers.ts.
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
// journey's piecesRequired — reduces to one check: held count of bucket X >= that bucket's
// own threshold. Perks/tomb-keys default to threshold 1 (own it once, done); map pieces
// threshold at their tomb's own `piecesRequired`; hieroglyphs threshold at
// `HIEROGLYPH_REQUIRED[id]`. `OwnedCounts` is the one input type this whole module takes;
// `deriveOwnedFacts` is the one place raw counts become the booleans the fine per-floor BFS
// (siteValidator.ts, genuinely unchanged — every room-level check there is threshold-1 by
// contract) actually consumes.
export type OwnedCounts = ReadonlyMap<string, number>

export const mapPieceBucket = (tombId: string): string => `mapPiece:${tombId}`
export const hieroglyphBucket = (hieroglyphId: string): string => `hieroglyph:${hieroglyphId}`

const thresholdFor = (id: string, journeyMeta: Record<string, JourneyMeta>): number => {
  if (id.startsWith("hieroglyph:")) return HIEROGLYPH_REQUIRED[id.slice("hieroglyph:".length)] ?? 1
  if (id.startsWith("mapPiece:")) return journeyMeta[id.slice("mapPiece:".length)]?.piecesRequired ?? 1
  return 1
}

// Bounded to whatever's actually been recorded in `counts` (a handful of perks/hieroglyphs/
// tombs at most), not the whole universe of possible bucket ids.
export const deriveOwnedFacts = (counts: OwnedCounts, journeyMeta: Record<string, JourneyMeta>): Set<string> =>
  new Set([...counts.keys()].filter(id => (counts.get(id) ?? 0) >= thresholdFor(id, journeyMeta)))

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

export type SiteReachability = {
  floors: ReadonlySet<number>
  // Map-piece / hieroglyph-fragment rewards found within this site's own reachable rooms —
  // tomb-key rewards are already folded into the fine BFS's own fixed point (below) and
  // need no separate harvesting; these two feed the whole-world threshold checks
  // (piecesRequired, HIEROGLYPH_REQUIRED) computeReachability applies across every site, not
  // a single floor's self-contained BFS.
  harvestedCounts: ReadonlyMap<string, number>
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
  resolveRequirements: ResolveKeyRequirements = noKeyRequirements
): SiteReachability => {
  const siteId = `${ref.journeyId}:${ref.levelIndex}`
  const reachable = new Set<number>([0])
  let keys = new Set(ownedFacts)
  const harvestedCounts = new Map<string, number>()
  const harvest = (id: string) => harvestedCounts.set(id, (harvestedCounts.get(id) ?? 0) + 1)

  for (let i = 0; i < site.length; i++) {
    if (!reachable.has(i)) continue

    // worldGen's FloorConfig (this module's SiteConfig type) is a slightly looser mirror
    // of game/siteTypes.ts's — real authored data only ever assigns values the stricter
    // type accepts too, so this cast is safe (see the two files' own "mirrors" comments).
    const result = assembleFloor(siteId, site[i] as GameFloorConfig, seed + i, undefined, {
      resolveKeyRequirements: resolveRequirements,
      floorRef: { journeyId: ref.journeyId, floorIndex: i },
    })
    if (!result.success) continue

    const { keys: expandedKeys, reachable: reachableHere } = collectReachableKeys(
      result.grid,
      result.grid.entrancePos,
      keys
    )
    keys = expandedKeys

    for (let r = 0; r < result.grid.rows; r++) {
      for (let c = 0; c < result.grid.cols; c++) {
        const cell = result.grid.cells[r][c]
        if (cell.type !== "room" || !reachableHere.has(`${r},${c}`)) continue
        if (cell.reward?.type === "mapPiece") harvest(mapPieceBucket(cell.reward.tombId))
        if (cell.reward?.type === "hieroglyphFragment") harvest(hieroglyphBucket(cell.reward.hieroglyphId))
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

  return { floors: reachable, harvestedCounts }
}

// Global scope: starter is always unlocked; every other tier needs its TIER_UNLOCK_PERK_ID
// treasure held (data/treasurePerks.ts) — threshold 1, already folded into `ownedFacts`.
export const isTierUnlocked = (tier: Tier, ownedFacts: ReadonlySet<string>): boolean => {
  const perkId = TIER_UNLOCK_PERK_ID[tier]
  return tier === "starter" || (perkId != null && ownedFacts.has(perkId))
}

// Journey scope: enterable once its tier is unlocked and (for tombs) `piecesRequired` map
// pieces are held. Pyramids have no piecesRequired (pass 0) — tier unlock is the only gate.
export const isJourneyEnterable = (
  tier: Tier,
  ownedFacts: ReadonlySet<string>,
  piecesRequired: number,
  mapPiecesHeld: number
): boolean => isTierUnlocked(tier, ownedFacts) && mapPiecesHeld >= piecesRequired

export type JourneyMeta = { tier: Tier; piecesRequired: number }

export type ReachabilityResult = {
  reachableFloors: ReadonlySet<string>
  unlockedTiers: ReadonlySet<Tier>
  // Map-piece / hieroglyph-fragment instances found within the reachable area this call
  // computed, aggregated across every journey — a caller driving a worklist (repeatedly
  // growing `ownedCounts` and calling again) merges these in for its next pass; see
  // `deriveOwnedFacts` above for how a raw count becomes a boolean fact once thresholded.
  harvestedCounts: ReadonlyMap<string, number>
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
  resolveRequirements: ResolveKeyRequirements = noKeyRequirements
): ReachabilityResult => {
  const ownedFacts = deriveOwnedFacts(ownedCounts, journeyMeta)
  const unlockedTiers = new Set(ALL_TIERS.filter(t => isTierUnlocked(t, ownedFacts)))
  const reachableFloors = new Set<string>()
  const harvestedCounts = new Map<string, number>()
  const addHarvested = (id: string, count: number) => harvestedCounts.set(id, (harvestedCounts.get(id) ?? 0) + count)

  for (const [journeyId, sites] of Object.entries(allConfigs)) {
    const meta = journeyMeta[journeyId]
    if (!meta) continue
    const mapPiecesHeld = ownedCounts.get(mapPieceBucket(journeyId)) ?? 0
    if (!isJourneyEnterable(meta.tier, ownedFacts, meta.piecesRequired, mapPiecesHeld)) continue

    sites.forEach((site, levelIndex) => {
      const ref: SiteRef = { journeyId, levelIndex }
      const siteResult = reachableFloorsInSite(ref, site, ownedFacts, undefined, resolveRequirements)
      for (const floorIndex of siteResult.floors) reachableFloors.add(floorKey({ ...ref, floorIndex }))
      for (const [id, count] of siteResult.harvestedCounts) addHarvested(id, count)
    })
  }

  return { reachableFloors, unlockedTiers, harvestedCounts }
}
