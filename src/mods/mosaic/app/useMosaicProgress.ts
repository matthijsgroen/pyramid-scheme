import { useProgression } from "@/app/state/useProgression"
import { useModState } from "@/app/state/useModState"
import { MOSAIC_TIERS, mosaicBucket, type MosaicTier } from "../game/mosaicCurrency"
import { carriedPieces, type TierCounts } from "../game/placementQueue"

type PlacedByTier = Partial<Record<MosaicTier, number>>

// How many pieces of each register the player has PLACED into the window. Distinct from how many
// they own (the ledger's per-register counts) — a found piece is carried until the player sets it
// in, which is what makes finishing a panel something they do rather than something that happened
// while they were elsewhere.
//
// Mod-owned persisted slice (useModState) so core's ProgressionState never carries it. Per
// register, because the registers fill independently from loot of their own difficulty.
export const useMosaicProgress = () => {
  const [placed, setPlaced, loaded] = useModState<PlacedByTier>("mosaic", {})
  return {
    loaded,
    placedCount: (tier: MosaicTier) => placed[tier] ?? 0,
    placeOne: (tier: MosaicTier) => setPlaced(prev => ({ ...prev, [tier]: (prev[tier] ?? 0) + 1 })),
  }
}

// Owned pieces the player still carries, summed over the registers.
export const usePiecesToPlace = () => {
  const { ledger, loaded: ledgerLoaded } = useProgression()
  const { placedCount, loaded: placedLoaded } = useMosaicProgress()
  const owned = Object.fromEntries(MOSAIC_TIERS.map(t => [t, ledger.get(mosaicBucket(t))])) as TierCounts
  const placed = Object.fromEntries(MOSAIC_TIERS.map(t => [t, placedCount(t)])) as TierCounts
  return {
    toPlace: carriedPieces(owned, placed).reduce((sum, c) => sum + c.count, 0),
    loaded: ledgerLoaded && placedLoaded,
  }
}
