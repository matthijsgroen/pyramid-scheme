import { useTranslation } from "react-i18next"
import { registerPerkContribution, useMergedEarnedPerks } from "@/app/SiteMap/perkContributions"
import { registerDetectorLevel } from "@/app/SiteMap/detectorLevels"
import { perkLevel } from "@/game/perkTotals"

// core's app entrypoint (side-effect): the families every world needs, always registered.
import "./treasureChest/plugin"
import "./keyGate/plugin"

// The corridor detector is the only perk core owns (a hidden corridor is core map structure, §7.1).
// Describe it, and derive its level from the earned perks for the merged detector-level accessor.
// Always registered (core is never toggled off).
export const DETECTION_CAP = 4

registerPerkContribution(() => {
  const { t } = useTranslation("treasures")
  return {
    describe: perk =>
      perk.type === "detection" ? { label: t("perks.detection", { level: perk.level ?? 1 }) } : undefined,
  }
})
registerDetectorLevel("corridor", () => perkLevel(useMergedEarnedPerks(), "detection", DETECTION_CAP))
