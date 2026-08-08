import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { registerRewardDisplays, type RewardDisplayFn } from "@/app/SiteMap/rewardDisplayRegistry"
import { journeys } from "@/data/journeys"
import { MapPieceIcon } from "@/ui/molecules/MapPieceIcon"
import { treasureDisplayByKeyId } from "../game/treasures"
import { TREASURE_PERKS } from "../game/treasurePerks"
import { useTombTreasureProgress } from "./useTombTreasureProgress"
import { useTreasurePerkLabel } from "./useTreasurePerkLabel"
import { mapPieceSchema, tombKeySchema } from "./rewardSchemas"

// The map-piece / tomb-key rewards' synchronous popup text/emoji (used by the generic RewardFlow
// fallback and the shop stock list), plus the map piece's rich display (where the map leads + how
// much of it is gathered). The rich display is hook-based so it can read the mod's own map-piece
// progress; the synchronous handler cannot, so it keeps the generic scrap-of-a-map text. The claim
// EFFECTS are the mod's reward contribution (see ./index); these handlers are display-only (no
// `apply`), so core owns neither type.
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

  registerRewardDisplays(useTombTreasureRewardDisplays)
}

const tombName = (tombId: string) => journeys.find(j => j.id === tombId)?.name

const useTombTreasureRewardDisplays = (): Partial<Record<string, RewardDisplayFn>> => {
  const { mapPieceProgress } = useTombTreasureProgress()
  const perkLabel = useTreasurePerkLabel()
  return {
    // A tomb treasure's whole point is what it does for you, and that used to be readable only
    // later, in the Collection. The popup now carries the same perk line, worded identically.
    tombKey: (reward, t) => {
      const { keyId } = tombKeySchema.parse(reward)
      const perk = TREASURE_PERKS[keyId]
      const info = treasureDisplayByKeyId[keyId]
      // Opening a tier or another tomb changes where you can go next, which outranks a stat bump.
      const rarity = perk?.type === "tier-unlock" || perk?.type === "location-key" ? "legendary" : "epic"
      if (!info) {
        return {
          rarity,
          itemName: t("chest.tombKey"),
          itemEffectDescription: perkLabel(keyId),
          ItemVisual: <span className="text-6xl">🗝</span>,
        }
      }
      return {
        rarity,
        itemName: t(`${info.category}.${info.treasureId}.name`, { ns: "treasures" }),
        itemDescription: t(`${info.category}.${info.treasureId}.description`, { ns: "treasures" }),
        itemEffectDescription: perkLabel(keyId),
        ItemVisual: <span className="text-6xl">{info.symbol}</span>,
      }
    },
    mapPiece: (reward, t) => {
      const { tombId } = mapPieceSchema.parse(reward)
      const progress = mapPieceProgress(tombId)
      const complete = progress.found >= progress.required
      // Where the map leads stays a hint while it's in pieces; completing the set is what names the
      // tomb — by then it's also enterable, so the reveal lands with somewhere to go.
      const itemDescription = complete
        ? t("chest.mapPieceComplete", {
            name: t(`${tombId}.name`, { ns: "journeys", defaultValue: tombName(tombId) ?? "" }),
          })
        : t(`${tombId}.mapHint`, { ns: "journeys", defaultValue: t("chest.mapPieceDescription") })
      return {
        rarity: complete ? "legendary" : progress.found >= 2 ? "rare" : "common",
        itemName: t("chest.mapPiece"),
        itemDescription,
        itemEffectDescription: t("chest.mapPieceProgress", {
          found: Math.min(progress.found, progress.required),
          required: progress.required,
        }),
        ItemVisual: <MapPieceIcon progress={progress} />,
      }
    },
  }
}
