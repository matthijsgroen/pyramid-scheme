import { registerRewardHandler, CONSUMABLE_EMOJI } from "./rewardHandlerRegistry"
import { hieroglyphCategory } from "./hieroglyphCategory"
import { getInventoryItemById } from "@/data/inventory"
import { getSellableById } from "@/data/sellables"
import type { ConsumableType } from "@/game/siteTypes"

// "fragmentSlot" (a TreasureReward variant) is intentionally left unregistered — it had no
// apply/display special case before this refactor either; both fall through to the generic
// default in applyReward.ts / rewardDisplay.ts.

registerRewardHandler({
  type: "hieroglyphFragment",
  apply: (reward, { progression }) => progression.addFragment(reward.hieroglyphId, reward.pieceIndex),
  emoji: "𓂀",
  text: (reward, t, hieroglyphProgress) => {
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
  },
})

registerRewardHandler({
  type: "mapPiece",
  apply: (reward, { progression, journeyId }) => {
    progression.collectMapPiece(reward.tombId)
    progression.markMapPieceFound(journeyId)
  },
  emoji: "📜",
  text: t => ({ itemName: t("chest.mapPiece"), itemDescription: t("chest.mapPieceDescription"), icon: "📜" }),
})

registerRewardHandler({
  type: "tombKey",
  apply: (reward, { progression }) => {
    progression.addTombKey(reward.keyId)
    progression.applyTreasurePerk(reward.keyId)
  },
  emoji: "🗝",
  text: t => ({ itemName: t("chest.tombKey"), icon: "🗝" }),
})

registerRewardHandler({
  type: "mosaicPiece",
  apply: (_reward, { progression }) => progression.collectMosaicPiece(),
  emoji: "🔷", // matches rewardEmoji's original default — mosaicPiece had no explicit branch there
  text: t => ({ itemName: t("chest.mosaicPiece"), itemDescription: t("chest.mosaicPieceDescription"), icon: "🟦" }),
})

registerRewardHandler({
  type: "consumable",
  apply: (reward, { progression }) => progression.addConsumable(reward.consumable),
  emoji: "🔷", // matches rewardEmoji's original default — "consumable" itself had no branch there
  text: (reward, t) => ({
    itemName: t(`chest.consumable.${reward.consumable}`),
    icon: CONSUMABLE_EMOJI[reward.consumable as ConsumableType],
  }),
})

registerRewardHandler({
  type: "money",
  apply: (reward, { progression }) => progression.addMoney(reward.amount),
  emoji: "🪙",
  text: (reward, t) => ({ itemName: t("chest.money", { amount: reward.amount }), icon: "🪙" }),
})

registerRewardHandler({
  type: "sellable",
  apply: (reward, { inventory }) => inventory.addItem(reward.itemId, 1),
  emoji: "🔷", // matches rewardEmoji's original default — "sellable" itself had no branch there
  text: (reward, t) => {
    const item = getSellableById(reward.itemId)
    return {
      itemName: item ? t(`${item.id}.name`, { ns: "sellables" }) : reward.itemId,
      itemDescription: item ? t(`${item.id}.description`, { ns: "sellables" }) : undefined,
      icon: item?.symbol ?? "🔷",
    }
  },
})

registerRewardHandler({
  type: "hieroglyphs",
  apply: () => {}, // never handled by applyReward.ts before this refactor either
  emoji: "𓂀",
  text: t => ({
    itemName: t("chest.hieroglyphs"),
    itemDescription: t("chest.hieroglyphsDescription", { defaultValue: "" }) || undefined,
    icon: "𓂀",
  }),
})
