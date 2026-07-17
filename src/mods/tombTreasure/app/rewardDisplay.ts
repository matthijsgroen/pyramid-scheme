import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"

// The map-piece / tomb-key rewards' synchronous popup text/emoji (used by the generic RewardFlow
// fallback and the shop stock list). The claim EFFECTS are the mod's reward contribution (see
// ./index); these handlers are display-only (no `apply`), so core owns neither type.
export const registerTombTreasureRewardDisplay = () => {
  registerRewardHandler({
    type: "mapPiece",
    emoji: "📜",
    text: (_reward, t) => ({
      itemName: t("chest.mapPiece"),
      itemDescription: t("chest.mapPieceDescription"),
      icon: "📜",
    }),
  })
  registerRewardHandler({
    type: "tombKey",
    emoji: "🗝",
    text: (_reward, t) => ({ itemName: t("chest.tombKey"), icon: "🗝" }),
  })
}
