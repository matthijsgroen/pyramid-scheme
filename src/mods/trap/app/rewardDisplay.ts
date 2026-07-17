import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { CONSUMABLE_EMOJI } from "./consumableEmoji"

// The consumable reward's synchronous popup text/emoji (used by the generic RewardFlow fallback
// and the shop stock list). The claim EFFECT is trap's reward contribution (see ./index); there
// is no rich display registration — the plain icon + label is enough.
export const registerTrapRewardDisplay = () => {
  registerRewardHandler({
    type: "consumable",
    emoji: "🔷", // no dedicated icon; text().icon below picks the consumable's own
    text: (reward, t) => ({
      itemName: t(`chest.consumable.${reward.consumable}`),
      icon: CONSUMABLE_EMOJI[reward.consumable as keyof typeof CONSUMABLE_EMOJI],
    }),
  })
}
