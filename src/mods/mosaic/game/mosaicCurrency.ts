import type { CappedCurrency } from "@/worldGen/placeFragments"
import type { CurrencyMeta } from "@/game/ledger/currencyRegistry"
import { LEVEL_STEPS } from "./mosaicRevealOrder"

// The mosaic-piece currencies — mod-owned capped filler, ONE POOL PER REGISTER. Mosaic never
// gates progress, so it's not on the reachability worklist (unlike map pieces / hieroglyph
// fragments); it's placed by placeFragments' phase-3 capped pass, spread across whatever loot
// nodes the gating currencies left free. See docs/mods/TARGET.md rule 2.
//
// A pool only takes loot nodes of its own difficulty (`slot.tier`, which is the node's own
// floor/section difficulty, not its journey's tier — so a starter wing inside a wizard tomb
// yields starter glass). That is what makes a register the record of one difficulty: the
// starter panel finishes when the starter paths are picked clean, whenever that happens.

export const MOSAIC_TIERS = ["starter", "junior", "expert", "master", "wizard"] as const
export type MosaicTier = (typeof MOSAIC_TIERS)[number]

export const mosaicBucket = (tier: MosaicTier) => `mosaicPiece_${tier}`

// How many pieces each register holds — its tier's share of the reveal sequence. Derived, not
// authored: the reveal is count-based per register (MosaicPage clamps to the tier's step count),
// so a piece past its register's last step would reveal nothing.
export const MOSAIC_STEPS_BY_TIER = Object.fromEntries(
  MOSAIC_TIERS.map(tier => [tier, LEVEL_STEPS.filter(s => s.journeyId.startsWith(`${tier}_`)).length])
) as Record<MosaicTier, number>

export const MOSAIC_TOTAL = Object.values(MOSAIC_STEPS_BY_TIER).reduce((sum, n) => sum + n, 0)

export const MOSAIC_CURRENCY_METAS: CurrencyMeta[] = MOSAIC_TIERS.map(tier => ({
  id: mosaicBucket(tier),
  ownerMod: "mosaic",
  displayName: `currency.mosaicPiece.${tier}`,
  icon: "🟦",
  kind: "capped",
  total: MOSAIC_STEPS_BY_TIER[tier],
}))

export const MOSAIC_CURRENCIES: CappedCurrency[] = MOSAIC_TIERS.map(tier => ({
  bucket: mosaicBucket(tier),
  toReward: () => ({ type: "mosaicPiece", tier }),
  totalRequired: () => MOSAIC_STEPS_BY_TIER[tier],
  // A register's glass comes out of paths of its own difficulty. Hard, not a preference: a
  // starter piece found on a wizard floor would fill the wrong panel.
  eligible: slot => slot.tier === tier,
  // Tagged slots first (the DSL's authored `prefers` hints), then everything else in natural
  // collection order — deterministic without an explicit sort. Mosaic is pure cosmetic filler,
  // so exact spread doesn't matter; refine here if placement aesthetics ever do.
  // ponytail: natural order is a fine spread for cosmetic loot, upgrade to a real ranker if needed.
  rank: candidates => {
    const bucket = mosaicBucket(tier)
    const tagged = candidates.filter(s => s.preference === bucket)
    const rest = candidates.filter(s => s.preference !== bucket)
    return [...tagged, ...rest]
  },
}))
