import type { SiteConfig, TreasureReward, MapPieceReward } from "./types"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { WORLD_TARGETS } from "./worldSpec"

const KNOWN_JOURNEY_IDS = new Set([...PYRAMID_JOURNEYS.map(j => j.id), ...TOMB_JOURNEYS.map(j => j.id)])

// A post-build check over the whole grown world, contributed by a mod (e.g. the shop economy
// guard) and injected into buildConfigs. Drops out with its mod, so core names no mod-specific
// balance rule.
export type WorldValidator = (configs: Record<string, SiteConfig[]>) => void

// Throws if: a non-last floor is set to exit, a mapPiece references an unknown journey ID,
// the total mapPiece count drifts from WORLD_TARGETS, or the count of placed gating-currency
// rewards drifts from what the registered currencies expect. Both the expected total and the
// "is this a gating-currency reward" predicate are injected (built from the registered
// currencies by the caller) — core names no specific currency, and a currency that leaves the
// registry drops its expectation and its rewards together, so toggle-off never trips a false
// "expected N, got 0". Omit both to skip the currency-reward check. Mod-owned capped currencies
// (mosaic) aren't checked here — placeFragments' phase-3 pass hard-fails if it can't fully place
// them, so core needs no per-mod count (docs/mods/TARGET.md rule 2).
export const validateRewardCounts = (
  configs: Record<string, SiteConfig[]>,
  expectedCurrencyRewards?: number,
  isCurrencyReward: (r: TreasureReward) => boolean = () => false
): void => {
  let mapPieces = 0
  let currencyRewards = 0
  const unknownTombIds: string[] = []

  const checkReward = (r: TreasureReward | undefined) => {
    if (!r) return
    if (r.type === "mapPiece") {
      const mp = r as MapPieceReward
      mapPieces++
      if (!KNOWN_JOURNEY_IDS.has(mp.tombId)) unknownTombIds.push(mp.tombId)
    }
    if (isCurrencyReward(r)) currencyRewards++
  }
  // Count both node reward fields: a path-end `endReward` AND every entry of a node's `rewards[]`
  // array (a shop's stock lands here). One uniform sweep, mirroring what the detector scans.
  const checkRewards = (rs: (TreasureReward | undefined)[] | undefined) => rs?.forEach(checkReward)

  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      for (let fi = 0; fi < floors.length; fi++) {
        const floor = floors[fi]
        const isLast = fi === floors.length - 1
        if (isLast && floor.exitOrStaircase !== "exit")
          throw new Error(
            `[worldSpec] Site "${siteId}" last floor has exitOrStaircase="${floor.exitOrStaircase}", expected "exit"`
          )
        checkReward(floor.mainEndReward)
        checkRewards(floor.rewards)
        for (const s of floor.sideSections) {
          checkReward(s.endReward)
          checkRewards(s.rewards)
          for (const sub of s.sideSections ?? []) {
            checkReward(sub.endReward)
            checkRewards(sub.rewards)
          }
        }
      }
    }
  }

  if (unknownTombIds.length > 0)
    throw new Error(
      `[worldSpec] mapPiece rewards reference unknown journey IDs: ${[...new Set(unknownTombIds)].join(", ")}`
    )
  if (mapPieces !== WORLD_TARGETS.mapPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mapPieceRewards} map pieces, got ${mapPieces}`)
  if (expectedCurrencyRewards !== undefined && currencyRewards !== expectedCurrencyRewards)
    throw new Error(`[worldSpec] Expected ${expectedCurrencyRewards} gating-currency rewards, got ${currencyRewards}`)
}

// NOTE: the old `validateDiscovery` post-build check (secondary-tomb discovery + ward-key
// ordering) was retired in §E — the worklist reachability model (src/worldGen/reachability.ts +
// placeFragments.ts) already subsumes and strengthens it: secondary-tomb enterability is
// count-aware there (a tomb's own `piecesRequired` map pieces) vs this check's existence-only BFS,
// and ward-key ordering is enforced structurally by the fine per-floor BFS + settleHarvest + the
// winnability sweep (placeFragments.ts, which hard-fails if any lock stays blocking). See
// docs/game-design/keys-and-locks-solver.md.
