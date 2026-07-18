import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { treasureDisplayByKeyId } from "../game/treasures"
import { tombKeySchema } from "./rewardSchemas"

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
    // A tomb key IS a specific treasure (the perk stream — "the treasure IS the key"), so show the
    // treasure actually received, not the opaque key type. Falls back to the generic label if the
    // keyId isn't a catalog treasure (e.g. a bare structural key).
    text: (reward, t) => {
      const info = treasureDisplayByKeyId[tombKeySchema.parse(reward).keyId]
      if (!info) return { itemName: t("chest.tombKey"), icon: "🗝" }
      return {
        itemName: t(`${info.category}.${info.treasureId}.name`, { ns: "treasures" }),
        itemDescription: t(`${info.category}.${info.treasureId}.description`, { ns: "treasures" }),
        icon: info.symbol,
      }
    },
  })
}
