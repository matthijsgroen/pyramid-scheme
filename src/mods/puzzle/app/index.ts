import { useTranslation } from "react-i18next"
import { registerPerkContribution } from "@/app/SiteMap/perkContributions"
import { isModEnabled } from "@/mods/registeredMods"

// puzzle's app entrypoint (side-effect): the non-gating puzzle families.
import "./sumplete/plugin"
import "./futoshiki/plugin"
import "./lightbeam/plugin"
import "./balanceScale/plugin"
import "./eclipse/plugin"
import "./constellation/plugin"
import "./starBattle/plugin"
import "./hidato/plugin"

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
