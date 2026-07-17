import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"

// The mosaicPiece reward's synchronous popup text/emoji (generic RewardFlow fallback). It uses the
// generic icon path — no rich display registration needed. The claim EFFECT is mosaic's reward
// contribution (see ./index).
export const registerMosaicRewardDisplay = () => {
  registerRewardHandler({
    type: "mosaicPiece",
    emoji: "🔷", // no dedicated icon; text().icon below is the real one
    // Signature is (reward, t) — the first arg is the reward, `t` is the translator. Taking a lone
    // `t =>` param bound it to the reward object, so t("chest.mosaicPiece") called the reward as a
    // function and crashed the reward popup (black screen) on the first mosaic a player ever opened.
    text: (_reward, t) => ({
      itemName: t("chest.mosaicPiece"),
      itemDescription: t("chest.mosaicPieceDescription"),
      icon: "🟦",
    }),
  })
}
