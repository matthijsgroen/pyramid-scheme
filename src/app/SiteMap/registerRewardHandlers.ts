import { registerRewardHandler } from "./rewardHandlerRegistry"

// Core owns only the tomb-treasure reward handlers (mapPiece / tombKey) — those write core state
// and aren't a toggleable mod's mechanic. Every other reward type's effect + display is owned by
// its mod: the claim EFFECT is a reward contribution (rewardContributions.ts), the SYNCHRONOUS
// text/emoji is a rewardHandler the mod registers from its own app entrypoint, and the rich popup
// content is a display registration (rewardDisplayRegistry.tsx). So core here names no mod reward
// type. "fragmentSlot" has no handler — it never survives serialization into the app.

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
