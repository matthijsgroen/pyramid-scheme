import { registerRewardHandler, CONSUMABLE_EMOJI } from "./rewardHandlerRegistry"
import { hieroglyphCategory } from "./hieroglyphCategory"
import { getInventoryItemById } from "@/data/inventory"
import { getSellableById } from "@/data/sellables"
import type { ConsumableType } from "@/game/siteTypes"

// "fragmentSlot" has no handler — falls through to applyReward.ts/rewardDisplay.ts's generic default.

// hieroglyph fragments write to core progression (fragments still live there), so this stays a
// core handler; it simply never fires when the hieroglyph mod is off (no such rewards are placed).
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
  emoji: "🔷", // no dedicated icon; text().icon below is the real one
  text: t => ({ itemName: t("chest.mosaicPiece"), itemDescription: t("chest.mosaicPieceDescription"), icon: "🟦" }),
})

// Display only — consumables are trap-owned, so the claim EFFECT (addConsumable) is a trap reward
// contribution (mods/trap/app), not a core apply. This entry just supplies the popup text/icon,
// and never fires when trap is off (no consumable rewards are placed).
registerRewardHandler({
  type: "consumable",
  emoji: "🔷", // no dedicated icon; text().icon below picks the consumable's own
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
  emoji: "🔷", // no dedicated icon; text().icon below uses the item's own symbol
  text: (reward, t) => {
    const item = getSellableById(reward.itemId)
    return {
      itemName: item ? t(`${item.id}.name`, { ns: "sellables" }) : reward.itemId,
      itemDescription: item ? t(`${item.id}.description`, { ns: "sellables" }) : undefined,
      icon: item?.symbol ?? "🔷",
    }
  },
})
