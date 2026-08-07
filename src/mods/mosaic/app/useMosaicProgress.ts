import { useModState } from "@/app/state/useModState"
import type { MosaicTier } from "../game/mosaicCurrency"

type SeenByTier = Partial<Record<MosaicTier, number>>

// Reveal-animation progress for the mosaic screen: how many reveal STEPS of each register the
// player has already watched animate in. Distinct from how many pieces they own (the ledger's
// per-register counts). Mod-owned persisted slice (useModState) so core's ProgressionState never
// carries it. Per register, because the registers fill independently — each is fed only by loot
// found at its own difficulty.
export const useMosaicProgress = () => {
  const [seen, setSeen] = useModState<SeenByTier>("mosaic", {})
  return {
    seenCount: (tier: MosaicTier) => seen[tier] ?? 0,
    markViewed: (counts: Record<MosaicTier, number>) =>
      setSeen(prev => {
        const next = { ...prev }
        for (const [tier, count] of Object.entries(counts) as [MosaicTier, number][]) {
          next[tier] = Math.max(next[tier] ?? 0, count)
        }
        return next
      }),
  }
}
