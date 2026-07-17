import { useTranslation } from "react-i18next"
import { registerPerkContribution } from "@/app/SiteMap/perkContributions"
import { registerDetectorLevel } from "@/app/SiteMap/detectorLevels"
import { useProgression } from "@/app/state/useProgression"

// core's app entrypoint (side-effect): the families every world needs, always registered.
import "./treasureChest/plugin"
import "./keyGate/plugin"

// The corridor detector is the only perk core owns (a hidden corridor is core map structure, §7.1).
// Grant/describe it and expose its level to the merged detector-level accessor. Always registered
// (core is never toggled off).
registerPerkContribution(() => {
  const { bumpDetection } = useProgression()
  const { t } = useTranslation("treasures")
  return {
    grant: perk => {
      if (perk.type === "detection") bumpDetection(perk.level ?? 1)
    },
    describe: perk =>
      perk.type === "detection" ? { label: t("perks.detection", { level: perk.level ?? 1 }) } : undefined,
  }
})
registerDetectorLevel("corridor", () => useProgression().perks.detectionLevel)
