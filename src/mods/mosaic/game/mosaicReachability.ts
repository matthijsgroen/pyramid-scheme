import type { TreasureReward } from "@/game/siteTypes"
import type { WorldValidator } from "@/worldGen/validate"
import { MOSAIC_STEPS_BY_TIER, MOSAIC_TIERS, type MosaicTier } from "./mosaicCurrency"

// Which register a reachable reward fills, or nothing if it is not glass at all. Mosaic's own
// reward shape, read by mosaic — core hands the validator raw rewards and names none of them.
const mosaicTierOf = (reward: TreasureReward): MosaicTier | undefined =>
  reward.type === "mosaicPiece" && MOSAIC_TIERS.includes(reward.tier as MosaicTier)
    ? (reward.tier as MosaicTier)
    : undefined

// Every reachable mosaic piece, counted per register.
export const reachableMosaicCounts = (reachableRewards: readonly TreasureReward[]): Record<MosaicTier, number> => {
  const counts = Object.fromEntries(MOSAIC_TIERS.map(tier => [tier, 0])) as Record<MosaicTier, number>
  for (const reward of reachableRewards) {
    const tier = mosaicTierOf(reward)
    if (tier) counts[tier]++
  }
  return counts
}

// Every register must be finishable: as many of its own pieces standing in reachable ground as it
// has steps to reveal. Per register and never as one world total — a single sum passes while the
// junior panel runs a piece short and the wizard one runs a piece over, and a panel short of one
// piece is a collection that can never be completed.
//
// Counted from a walk in the permissive bracket (placeFragments' final pass), because a collection
// is loot rather than a lock: a piece in a discovery-gated pocket counts, and so does one behind a
// door whose key the player solves for.
//
// Mosaic-owned and injected as the mod's worldValidator, so the check leaves with the mod.
export const mosaicReachabilityValidator: WorldValidator = (_configs, reachableRewards) => {
  const counts = reachableMosaicCounts(reachableRewards)
  const short = MOSAIC_TIERS.filter(tier => counts[tier] < MOSAIC_STEPS_BY_TIER[tier])
  if (short.length > 0) {
    const detail = short.map(tier => `${tier}: ${counts[tier]}/${MOSAIC_STEPS_BY_TIER[tier]}`).join(", ")
    throw new Error(`[worldSpec] Mosaic register(s) cannot be completed — reachable pieces short of target: ${detail}`)
  }
}
