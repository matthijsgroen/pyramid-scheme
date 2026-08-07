import { z } from "zod"
import { registerModScreen } from "@/app/pages/screenRegistry"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { useProgression } from "@/app/state/useProgression"
import { MOSAIC_TIERS, mosaicBucket } from "../game/mosaicCurrency"
import { MosaicPage } from "./MosaicPage"
import { registerMosaicRewardDisplay } from "./rewardDisplay"

// Mosaic's app-side registration (side-effect), self-gated on the mod being enabled:
// - its screen (Base renders the screen registry, naming no mod).
// - the reward contribution: a mosaicPiece pickup increments the piece count (the effect) — the
//   mod owns the reward id, core owns the ledger bucket it writes to.
// See docs/mods/app-plugins-design.md.
if (isModEnabled("mosaic")) {
  registerModScreen({ id: "mosaic", Component: MosaicPage })
  registerMosaicRewardDisplay()
  // A mosaic piece carries the register it belongs to, so a find fills the panel for the
  // difficulty it was found on.
  const mosaicPieceSchema = z.object({ type: z.literal("mosaicPiece"), tier: z.enum(MOSAIC_TIERS) })
  registerRewardSchema("mosaicPiece", mosaicPieceSchema)
  registerRewardContribution(() => {
    const progression = useProgression()
    return {
      effects: {
        mosaicPiece: reward => {
          const { tier } = mosaicPieceSchema.parse(reward)
          progression.ledger.grant(mosaicBucket(tier), 1)
        },
      },
    }
  })
}
