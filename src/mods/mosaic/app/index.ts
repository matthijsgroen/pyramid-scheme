import { use } from "react"
import { z } from "zod"
import { FezContext } from "@/app/fez/context"
import { registerModEntrance } from "@/app/home/modEntrances"
import { registerHaulLines } from "@/app/home/haulLines"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { useProgression } from "@/app/state/useProgression"
import { MOSAIC_TIERS, mosaicBucket } from "../game/mosaicCurrency"
import { useMosaicEntranceLabel } from "./campEntrance"
import { useMosaicHaulLines } from "./haulLines"
import { MosaicPage } from "./MosaicPage"
import { registerMosaicRewardDisplay } from "./rewardDisplay"
import { MOSAIC_INTRO } from "./useMosaicReminder"

// Mosaic's app-side registration (side-effect), self-gated on the mod being enabled:
// - the reward contribution: a mosaicPiece pickup increments the piece count (the effect) — the
//   mod owns the reward id, core owns the ledger bucket it writes to.
// - the home: the camp window opens the mosaic, and the pieces brought home read as one line.
// See docs/mods/app-plugins-design.md.
if (isModEnabled("mosaic")) {
  registerModEntrance({
    id: "mosaic",
    object: "window",
    useLabel: useMosaicEntranceLabel,
    Screen: MosaicPage,
    title: t => t("mosaic.entrance.title"),
  })
  registerHaulLines(useMosaicHaulLines)
  registerMosaicRewardDisplay()
  // A mosaic piece carries the register it belongs to, so a find fills the panel for the
  // difficulty it was found on.
  const mosaicPieceSchema = z.object({ type: z.literal("mosaicPiece"), tier: z.enum(MOSAIC_TIERS) })
  registerRewardSchema("mosaicPiece", mosaicPieceSchema)
  registerRewardContribution(() => {
    const progression = useProgression()
    const fez = use(FezContext)
    return {
      effects: {
        mosaicPiece: reward => {
          const { tier } = mosaicPieceSchema.parse(reward)
          progression.ledger.grant(mosaicBucket(tier), 1)
        },
      },
      // A tutorial, told once: what the piece is and where it goes.
      seen: { mosaicPiece: () => fez.showConversation(MOSAIC_INTRO) },
    }
  })
}
