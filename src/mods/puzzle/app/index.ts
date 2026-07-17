import { useTranslation } from "react-i18next"
import { registerPerkContribution } from "@/app/SiteMap/perkContributions"
import { isModEnabled } from "@/mods/registeredMods"
import { usePuzzleProgress } from "./usePuzzleProgress"

// puzzle's app entrypoint (side-effect): the non-gating puzzle families.
import "./sumplete/plugin"
import "./sumpleteMirror/plugin"
import "./crocodile/plugin"

// The scribes-eye perk (extra tableau hint slots) is puzzle-owned: grant/describe it via the seam,
// self-gated on the mod (§7.4).
if (isModEnabled("puzzle")) {
  registerPerkContribution(() => {
    const puzzle = usePuzzleProgress()
    const { t } = useTranslation("treasures")
    return {
      grant: perk => puzzle.grantPerk(perk),
      describe: perk =>
        perk.type === "scribes-eye" ? { label: t("perks.scribes-eye", { level: perk.level ?? 1 }) } : undefined,
    }
  })
}
