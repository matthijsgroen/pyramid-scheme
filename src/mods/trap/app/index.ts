import { useTranslation } from "react-i18next"
import { registerHudWidget } from "@/app/SiteMap/hudRegistry"
import { registerHomecoming, registerHomecomingPanel } from "@/app/homecomingRegistry"
import { registerHaulLines } from "@/app/home/haulLines"
import { registerHomeTags } from "@/app/home/homeTags"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { registerPerkContribution, type Perk } from "@/app/SiteMap/perkContributions"
import { isModEnabled } from "@/mods/registeredMods"
import { RestPanel } from "./RestPanel"
import { useTrapHaulLines } from "./haulLines"
import { TrapHud } from "./TrapHud"
import { useTrapHomeTags, useTrapProgress } from "./useTrapProgress"
import { registerTrapRewardDisplay } from "./rewardDisplay"
import { waterskinRewardSchema } from "./rewardSchema"
import { useTrapRewardContribution } from "./rewardContribution"
import "./arithmeticReflex/plugin" // trap encounter families (self-gated)
import "./clockReflex/plugin"
import "./crocodile/plugin" // the tomb capstone: a puzzle that bites, not a trap (crocodile.md §6)

// Trap-owned perk ids (granted by tomb treasures via the perk seam). describe reads treasures.json
// `perks.<type>` — a shared namespace, mod-owned keys (see §8.0.1 i18n decision).
const TRAP_PERKS = new Set(["max-health", "armor", "trap-insight", "pack-mule"])

// Trap's app-side registration (side-effect), self-gated on the mod being enabled:
// - the HUD widget (health),
// - the reward contribution: the waterskin claim effect (./rewardContribution),
// - the perk contribution: describes the four trap-owned perks (§7.4),
// - the homecoming: health is restored on coming back to camp, and the rest panel shows it,
// - the home haul: a waterskin leaves no line,
// - the home tags: whether coming home refilled a heart.
// See docs/mods/app-plugins-design.md.
if (isModEnabled("trap")) {
  registerHudWidget({ id: "trap", order: 0, Component: TrapHud })
  registerTrapRewardDisplay()
  registerRewardSchema("waterskin", waterskinRewardSchema)
  registerRewardContribution(useTrapRewardContribution)
  registerPerkContribution(() => {
    const { t } = useTranslation("treasures")
    return {
      describe: (perk: Perk) =>
        TRAP_PERKS.has(perk.type) ? { label: t(`perks.${perk.type}`, { level: perk.level ?? 1 }) } : undefined,
    }
  })
  registerHomecoming(() => useTrapProgress().restoreHealth)
  registerHomecomingPanel({ id: "trap", order: 0, Component: RestPanel })
  registerHaulLines(useTrapHaulLines)
  registerHomeTags(useTrapHomeTags)
}
