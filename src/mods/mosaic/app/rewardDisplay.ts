import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"

// The mosaicPiece reward's synchronous popup text/emoji (generic RewardFlow fallback). It uses the
// generic icon path — no rich display registration needed. The claim EFFECT is mosaic's reward
// contribution (see ./index).
export const registerMosaicRewardDisplay = () => {
  registerRewardHandler({
    type: "mosaicPiece",
    emoji: "🔷", // no dedicated icon; text().icon below is the real one
    text: t => ({ itemName: t("chest.mosaicPiece"), itemDescription: t("chest.mosaicPieceDescription"), icon: "🟦" }),
  })
}
