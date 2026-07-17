import { useModState } from "@/app/state/useModState"

// Reveal-animation progress for the mosaic screen: how many mosaic reveal STEPS the player has
// already watched animate in. Distinct from how many pieces they own (the ledger's mosaicPiece
// count). Mod-owned persisted slice (useModState) so core's ProgressionState never carries it.
//
// Migration note: this moved off ProgressionState onto its own storage key, so an existing
// player's seenCount resets to 0 once — no data loss (the ledger piece count is untouched), just
// a one-time replay of reveal animations they've already seen.
export const useMosaicProgress = () => {
  const [seenCount, setSeenCount] = useModState("mosaic", 0)
  return {
    seenCount,
    markViewed: (count: number) => setSeenCount(prev => Math.max(prev, count)),
  }
}
