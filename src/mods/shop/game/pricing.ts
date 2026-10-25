import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import type { TreasureReward } from "@/worldGen/types"
import { PURCHASES, type PurchaseTable } from "./purchases"
import { purchaseRewardSchema } from "./rewardSchemas"

// The Fez shop is the money authority: it prices every stock item, so the currency mods stay
// money-blind (they only say WHAT to sell + WHERE, never for how much). This is a per-reward-type
// price map — it names other mods' reward-type ids on purpose (the chosen design). That's a
// mod→mod coupling, NOT a core leak: the shop is itself a mod, and an off mod's key is simply never
// hit (its pieces aren't placed). Runtime + the build-time economy guard share this one function.

// Fragments scale with the shop's tier (a wizard-tomb fragment costs more than a junior one);
// mosaic + map pieces are flat. Matches the pre-slice locked price list. A purchase costs what its
// row in the purchase table says, at any tier.
const fragmentPrice = (tier: Difficulty): number => 250 + 50 * difficulties.indexOf(tier)

export const priceFor = (reward: TreasureReward, tier: Difficulty, purchases: PurchaseTable = PURCHASES): number => {
  switch (reward.type) {
    case "hieroglyphFragment":
      return fragmentPrice(tier)
    case "mosaicPiece":
      return 500
    case "mapPiece":
      return 1000
    case "purchase": {
      const { id } = purchaseRewardSchema.parse(reward)
      return purchases.find(p => p.id === id)?.price ?? 0
    }
    default:
      return 0 // money/sellable/anything else isn't priced shop stock
  }
}
