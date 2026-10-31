import type { RewardContribution } from "@/app/SiteMap/rewardContributions"
import { useTrapProgress } from "./useTrapProgress"

// Trap's claim effect, reading trap's own state so core never sees trap. A waterskin is drunk on
// pickup — it heals, or at full health does nothing — and is gone either way, so it is never refused.
export const useTrapRewardContribution = (): RewardContribution => {
  const trap = useTrapProgress()
  return { effects: { waterskin: () => trap.drinkWaterskin() } }
}
