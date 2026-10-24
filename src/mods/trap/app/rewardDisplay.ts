import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"

// The waterskin's synchronous popup text/emoji (used by the generic RewardFlow fallback and the
// shop stock list). The claim EFFECT is trap's reward contribution (see ./rewardContribution); there
// is no rich display registration — the plain icon + label is enough.
export const registerTrapRewardDisplay = () => {
  registerRewardHandler({
    type: "waterskin",
    emoji: "💧",
    text: (_reward, t) => ({
      itemName: t("chest.waterskin"),
      itemDescription: t("chest.waterskinDescription"),
      icon: "💧",
    }),
  })
}
