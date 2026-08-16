import { useTranslation } from "react-i18next"
import { registerPerkContribution } from "@/app/SiteMap/perkContributions"
import { isModEnabled } from "@/mods/registeredMods"

// puzzle's app entrypoint (side-effect): the non-gating puzzle families.
import "./sumplete/plugin"
import "./sumpleteMirror/plugin"
import "./crocodile/plugin"
// Last on purpose: a bare "puzzle" tag resolves to the first family registered under it, so a family
// still in playtesting must never be the one that answers it.
import "./balanceScale/plugin"

// The scribes-eye perk (extra tableau hint slots) is puzzle-owned: described via the seam, its level
// derived from the treasures held (usePuzzleProgress). Self-gated on the mod (§7.4).
if (isModEnabled("puzzle")) {
  registerPerkContribution(() => {
    const { t } = useTranslation("treasures")
    return {
      describe: perk =>
        perk.type === "scribes-eye" ? { label: t("perks.scribes-eye", { level: perk.level ?? 1 }) } : undefined,
    }
  })
}
