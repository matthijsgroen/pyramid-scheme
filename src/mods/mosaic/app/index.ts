import { z } from "zod"
import { registerModScreen } from "@/app/pages/screenRegistry"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { useProgression } from "@/app/state/useProgression"
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
  // mosaicPiece carries no payload — just the type tag.
  registerRewardSchema("mosaicPiece", z.object({ type: z.literal("mosaicPiece") }))
  registerRewardContribution(() => {
    const progression = useProgression()
    return {
      effects: {
        mosaicPiece: () => progression.ledger.grant("mosaicPiece", 1),
      },
    }
  })
}
