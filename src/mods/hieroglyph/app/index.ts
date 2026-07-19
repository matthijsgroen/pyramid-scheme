import { useTranslation } from "react-i18next"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { registerCompassScanner } from "@/app/SiteMap/detectorScanners"
import { registerPerkContribution } from "@/app/SiteMap/perkContributions"
import { registerDetectorLevel } from "@/app/SiteMap/detectorLevels"
import { registerCompassTarget } from "@/app/SiteMap/compassTarget"
import { registerHeldKeysProvider } from "@/app/SiteMap/keyProviders"
import { isModEnabled } from "@/mods/registeredMods"
import { useHieroglyphProgress } from "./useHieroglyphProgress"
import { useHieroglyphCompassScanner } from "./compassScanner"
import { registerHieroglyphRewardDisplay } from "./rewardDisplay"
import { hieroglyphFragmentSchema } from "./rewardSchema"
import "./plugin"
import "./collection"

// hieroglyph's app entrypoint (side-effect): the tableau family plugin + the Collection section
// (both self-gated in their own files), plus the gated reward/detector registrations:
// - the reward contribution: a fragment pickup adds to the mod's own collection (effect), and an
//   already-collected fragment is SILENTLY skipped (skip, not canAccept — you own it, nothing to
//   do; it's not a "come back later" refusal like a full consumable pack) — both read the mod's
//   own state, so core never names `hieroglyphFragment`.
// - the compass detector scanner: finds uncollected fragment locations for a target hieroglyph.
if (isModEnabled("hieroglyph")) {
  registerHieroglyphRewardDisplay()
  registerRewardSchema("hieroglyphFragment", hieroglyphFragmentSchema)
  registerRewardContribution(() => {
    const hg = useHieroglyphProgress()
    return {
      effects: {
        hieroglyphFragment: reward => {
          const { hieroglyphId, pieceIndex } = hieroglyphFragmentSchema.parse(reward)
          hg.addFragment(hieroglyphId, pieceIndex)
        },
      },
      skip: reward => {
        if (reward.type !== "hieroglyphFragment") return false
        const { hieroglyphId, pieceIndex } = hieroglyphFragmentSchema.parse(reward)
        return hg.hasFragment(hieroglyphId, pieceIndex)
      },
    }
  })
  registerCompassScanner(useHieroglyphCompassScanner)
  // The compass perk (fragment detector) is hieroglyph-owned: grant/describe it, and expose its
  // level to the merged detector-level accessor (§7.4).
  registerPerkContribution(() => {
    const hg = useHieroglyphProgress()
    const { t } = useTranslation("treasures")
    return {
      grant: perk => hg.grantPerk(perk),
      describe: perk =>
        perk.type === "compass" ? { label: t("perks.compass", { level: perk.level ?? 1 }) } : undefined,
    }
  })
  registerDetectorLevel("compass", () => useHieroglyphProgress().compassLevel)
  // The hunt target is picked on the Collection screen (§3C) and stored in the mod's own state;
  // core reads it through this seam to drive the in-run compass readout without naming the mod.
  registerCompassTarget(() => useHieroglyphProgress().compassTarget)
  // Completed hieroglyphs are held keys (`hieroglyph:${id}`), so a tableau the player can now solve
  // reads as unlocked content on the travel screen — same seam the tomb-treasure mod uses for ward
  // keys. Core never learns these are hieroglyphs; a tableau node just exposes them as requiredKeyIds.
  registerHeldKeysProvider(() => useHieroglyphProgress().completedHieroglyphKeys)
}
