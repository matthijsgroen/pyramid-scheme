import { useModState } from "@/app/state/useModState"
import type { MosaicTier } from "../game/mosaicCurrency"

type PlacedByTier = Partial<Record<MosaicTier, number>>

// How many pieces of each register the player has PLACED into the window. Distinct from how many
// they own (the ledger's per-register counts) — a found piece is carried until the player sets it
// in, which is what makes finishing a panel something they do rather than something that happened
// while they were elsewhere.
//
// Mod-owned persisted slice (useModState) so core's ProgressionState never carries it. Per
// register, because the registers fill independently from loot of their own difficulty.
export const useMosaicProgress = () => {
  const [placed, setPlaced] = useModState<PlacedByTier>("mosaic", {})
  return {
    placedCount: (tier: MosaicTier) => placed[tier] ?? 0,
    placeOne: (tier: MosaicTier) => setPlaced(prev => ({ ...prev, [tier]: (prev[tier] ?? 0) + 1 })),
  }
}
