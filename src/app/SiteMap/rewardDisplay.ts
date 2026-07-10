import type { TreasureReward } from "@/game/siteTypes"
import { hieroglyphCategory } from "./hieroglyphCategory"
import { getInventoryItemById } from "@/data/inventory"
import { getSellableById } from "@/data/sellables"

export type TFn = (key: string, opts?: Record<string, unknown>) => string

// Single seam for "what emoji represents this reward/consumable" — was duplicated across
// ChestRewardFlow's own rewardEmoji and SiteMapScreen's CONSUMABLE_ICONS map.
export const rewardEmoji = (type: string): string => {
  if (type === "mapPiece") return "📜"
  if (type === "hieroglyphFragment") return "𓂀"
  if (type === "tombKey") return "🗝"
  if (type === "hieroglyphs") return "𓂀"
  if (type === "bandage") return "🩹"
  if (type === "oil") return "🫙"
  if (type === "trapTool") return "🔧"
  if (type === "money") return "🪙"
  return "🔷"
}

export type RewardText = { itemName: string; itemDescription?: string; icon: string }

// Single seam for "what's the plain name/description/fallback-icon for this reward" — was
// duplicated across ChestRewardFlow's LootPopup switch and SiteMapScreen's narrower
// rareItemDisplay. Richer per-type visuals (HieroglyphTile with fragment progress, rarity
// ribbons) stay local to whichever component needs them; this only covers the shared text.
export const rewardText = (
  reward: TreasureReward,
  t: TFn,
  hieroglyphProgress?: (id: string) => { found: number; required: number }
): RewardText => {
  if (reward.type === "hieroglyphFragment") {
    const item = getInventoryItemById(reward.hieroglyphId)
    const category = hieroglyphCategory(reward.hieroglyphId)
    const name = item
      ? t(`${category}.${reward.hieroglyphId}.name`, { ns: "inventory", defaultValue: item.name })
      : t("chest.hieroglyphFragment")
    const progress = hieroglyphProgress?.(reward.hieroglyphId)
    const itemDescription = progress
      ? `${t(`${category}.${reward.hieroglyphId}.description`, { ns: "inventory", defaultValue: item?.description ?? "" })}\n\n${t("chest.fragmentProgress", { found: Math.min(progress.found, progress.required), required: progress.required })}`
      : undefined
    return { itemName: `${name} — ${t("chest.hieroglyphFragment")}`, itemDescription, icon: item?.symbol ?? "𓂀" }
  }
  if (reward.type === "mapPiece") {
    return { itemName: t("chest.mapPiece"), itemDescription: t("chest.mapPieceDescription"), icon: "📜" }
  }
  if (reward.type === "mosaicPiece") {
    return { itemName: t("chest.mosaicPiece"), itemDescription: t("chest.mosaicPieceDescription"), icon: "🟦" }
  }
  if (reward.type === "tombKey") {
    return { itemName: t("chest.tombKey"), icon: "🗝" }
  }
  if (reward.type === "consumable") {
    return { itemName: t(`chest.consumable.${reward.consumable}`), icon: rewardEmoji(reward.consumable) }
  }
  if (reward.type === "money") {
    return { itemName: t("chest.money", { amount: reward.amount }), icon: "🪙" }
  }
  if (reward.type === "sellable") {
    const item = getSellableById(reward.itemId)
    return {
      itemName: item ? t(`${item.id}.name`, { ns: "sellables" }) : reward.itemId,
      itemDescription: item ? t(`${item.id}.description`, { ns: "sellables" }) : undefined,
      icon: item?.symbol ?? "🔷",
    }
  }
  return {
    itemName: t(`chest.${reward.type}`),
    itemDescription: t(`chest.${reward.type}Description`, { defaultValue: "" }) || undefined,
    icon: rewardEmoji(reward.type),
  }
}
