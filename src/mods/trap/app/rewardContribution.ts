import type { RewardContribution } from "@/app/SiteMap/rewardContributions"
import { consumableRewardSchema } from "./rewardSchema"
import { useTrapProgress } from "./useTrapProgress"

// Trap's claim effects, reading trap's own state so core never sees trap. A waterskin is drunk on
// pickup — it heals, or at full health does nothing — and is gone either way, so it is never
// refused. A consumable adds to the pack, and a full pack refuses one (canAccept).
export const useTrapRewardContribution = (): RewardContribution => {
  const trap = useTrapProgress()
  return {
    effects: {
      consumable: reward => trap.addConsumable(consumableRewardSchema.parse(reward).consumable),
      waterskin: () => trap.drinkWaterskin(),
    },
    canAccept: reward => reward.type !== "consumable" || !trap.isConsumablePackFull(),
  }
}
