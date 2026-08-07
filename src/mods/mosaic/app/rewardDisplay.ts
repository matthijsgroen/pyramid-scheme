import { registerRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { MOSAIC_TIERS, type MosaicTier } from "../game/mosaicCurrency"

// One glass colour per register, echoing its scene: lapis at the guardian's door, ochre for the
// scribe's first lesson, sunlight in the temple hall, green for the king, a cut facet for the
// heart weighed against a feather. Cosmetic — the piece's own tier picks the icon, so a popup
// says at a glance which of the five panels just came closer.
const ICON_BY_TIER: Record<MosaicTier, string> = {
  starter: "🔵",
  junior: "🔶",
  expert: "🟡",
  master: "🟢",
  wizard: "💠",
}

const GENERIC_ICON = "🔷"

const isMosaicTier = (tier: unknown): tier is MosaicTier => MOSAIC_TIERS.includes(tier as MosaicTier)

// The mosaicPiece reward's synchronous popup text/emoji (generic RewardFlow fallback). It uses the
// generic icon path — no rich display registration needed. The claim EFFECT is mosaic's reward
// contribution (see ./index).
export const registerMosaicRewardDisplay = () => {
  registerRewardHandler({
    type: "mosaicPiece",
    emoji: GENERIC_ICON, // no dedicated icon; text().icon below is the real one
    // Signature is (reward, t) — the first arg is the reward, `t` is the translator. Taking a lone
    // `t =>` param bound it to the reward object, so t("chest.mosaicPiece") called the reward as a
    // function and crashed the reward popup (black screen) on the first mosaic a player ever opened.
    text: (reward, t) => {
      const tier: unknown = reward.tier
      return {
        itemName: t("chest.mosaicPiece"),
        itemDescription: t("chest.mosaicPieceDescription"),
        icon: isMosaicTier(tier) ? ICON_BY_TIER[tier] : GENERIC_ICON,
      }
    },
  })
}
