import type { ReachabilitySupport } from "@/worldGen/reachability"
import { PURCHASES, requirementsFor, type PurchaseTable } from "./purchases"
import { purchaseRewardSchema } from "./rewardSchemas"

// The shop's contribution to the world-gen reachability model: a purchase standing in reachable stock is held as its
// fact, and each gate a purchase opens asks for that fact. Merged with every other mod's support (registeredMods.ts),
// so a tier or tomb asks for its purchase on top of what the other mods ask. Shop off: no purchase, no gate.
export const shopReachability = (table: PurchaseTable): ReachabilitySupport => {
  const requirements = requirementsFor(table)
  return {
    bucketForReward: reward =>
      reward.type === "purchase" ? table.find(p => p.id === purchaseRewardSchema.parse(reward).id)?.fact : undefined,
    tierUnlockGroups: requirements.tierGroups,
    journeyEntryLocks: requirements.entryLocks,
  }
}

export const SHOP_REACHABILITY: ReachabilitySupport = shopReachability(PURCHASES)
