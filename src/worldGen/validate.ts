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
  const hiddenGating: string[] = []

  // A hidden corridor is a discovery-gated OPTIONAL pocket (keys-and-locks-solver.md §E /
  // collection-and-detector-design.md §7.3): structurally reachable but never guaranteed
  // reachable, so a progression-gating currency the solver must guarantee (a map piece, or a
  // registered gating currency like a hieroglyph fragment) may NEVER sit there — placing one
  // would soft-lock a player who can't reveal the corridor. placeFragments excludes hidden slots
  // from the gating worklist; this is the post-build proof that nothing slipped through.
  const isGating = (r: TreasureReward) => r.type === "mapPiece" || isCurrencyReward(r)

  const checkReward = (r: TreasureReward | undefined, hidden: boolean, where: string) => {
    if (!r) return
    if (r.type === "mapPiece") {
      const mp = r as MapPieceReward
      mapPieces++
      if (!KNOWN_JOURNEY_IDS.has(mp.tombId)) unknownTombIds.push(mp.tombId)
    }
    if (isCurrencyReward(r)) currencyRewards++
    if (hidden && isGating(r)) hiddenGating.push(`${where}: ${r.type}`)
  }
  // Count both node reward fields: a path-end `endReward` AND every entry of a node's `rewards[]`
  // array (a shop's stock lands here). One uniform sweep, mirroring what the detector scans.
  const checkRewards = (rs: (TreasureReward | undefined)[] | undefined, hidden: boolean, where: string) =>
    rs?.forEach(r => checkReward(r, hidden, where))

  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      for (let fi = 0; fi < floors.length; fi++) {
        const floor = floors[fi]
        const isLast = fi === floors.length - 1
        if (isLast && floor.exitOrStaircase !== "exit")
          throw new Error(
            `[worldSpec] Site "${siteId}" last floor has exitOrStaircase="${floor.exitOrStaircase}", expected "exit"`
          )
        checkReward(floor.mainEndReward, false, `${siteId}#${fi} main`)
        checkRewards(floor.rewards, false, `${siteId}#${fi} main`)
        for (const s of floor.sideSections) {
          const secHidden = !!s.hidden
          checkReward(s.endReward, secHidden, `${siteId}#${fi} side`)
          checkRewards(s.rewards, secHidden, `${siteId}#${fi} side`)
          for (const sub of s.sideSections ?? []) {
            const subHidden = secHidden || !!sub.hidden
            checkReward(sub.endReward, subHidden, `${siteId}#${fi} sub`)
            checkRewards(sub.rewards, subHidden, `${siteId}#${fi} sub`)
          }
        }
      }
    }
  }

  if (hiddenGating.length > 0)
    throw new Error(
      `[worldSpec] ${hiddenGating.length} gating-currency reward(s) placed in hidden (discovery-gated) ` +
        `pockets — a hidden corridor is optional loot only and may never hold a required currency ` +
        `(collection-and-detector-design.md §7.3): ${hiddenGating.slice(0, 8).join("; ")}` +
        (hiddenGating.length > 8 ? ` …(+${hiddenGating.length - 8} more)` : "")
    )
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
