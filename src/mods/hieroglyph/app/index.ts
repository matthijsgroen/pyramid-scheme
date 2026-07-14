import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerCompassScanner } from "@/app/SiteMap/detectorScanners"
import { isModEnabled } from "@/mods/registeredMods"
import { useHieroglyphProgress } from "./useHieroglyphProgress"
import { useHieroglyphCompassScanner } from "./compassScanner"
import { registerHieroglyphRewardDisplay } from "./rewardDisplay"
import "./plugin"
import "./collection"

// hieroglyph's app entrypoint (side-effect): the tableau family plugin + the Collection section
// (both self-gated in their own files), plus the gated reward/detector registrations:
// - the reward contribution: a fragment pickup adds to the mod's own collection (effect), and an
//   already-collected fragment is refused (canAccept) — both read the mod's own state, so core
//   never names `hieroglyphFragment`.
// - the compass detector scanner: finds uncollected fragment locations for a target hieroglyph.
if (isModEnabled("hieroglyph")) {
  registerHieroglyphRewardDisplay()
  registerRewardContribution(() => {
    const hg = useHieroglyphProgress()
    return {
      effects: {
        hieroglyphFragment: reward => {
          if (reward.type === "hieroglyphFragment") hg.addFragment(reward.hieroglyphId, reward.pieceIndex)
        },
      },
      canAccept: reward =>
        reward.type !== "hieroglyphFragment" || !hg.hasFragment(reward.hieroglyphId, reward.pieceIndex),
    }
  })
  registerCompassScanner(useHieroglyphCompassScanner)
}
