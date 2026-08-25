import { useTranslation } from "react-i18next"
import { registerHudWidget } from "@/app/SiteMap/hudRegistry"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { registerPerkContribution, type Perk } from "@/app/SiteMap/perkContributions"
import { registerDetectorLevel } from "@/app/SiteMap/detectorLevels"
import { isModEnabled } from "@/mods/registeredMods"
import { TrapHud } from "./TrapHud"
import { useTrapProgress } from "./useTrapProgress"
import { registerTrapRewardDisplay } from "./rewardDisplay"
import { consumableRewardSchema } from "./rewardSchema"
import "./arithmeticReflex/plugin" // trap encounter families (self-gated)
import "./clockReflex/plugin"
import "./crocodile/plugin" // the tomb capstone: a puzzle that bites, not a trap (crocodile.md §6)

// Trap-owned perk ids (granted by tomb treasures via the perk seam). describe reads treasures.json
// `perks.<type>` — a shared namespace, mod-owned keys (see §8.0.1 i18n decision).
const TRAP_PERKS = new Set(["max-health", "armor", "trap-insight", "pack-mule", "consumable-detector"])

// Trap's app-side registration (side-effect), self-gated on the mod being enabled:
// - the HUD widget (health + consumables),
// - the reward contribution: a consumable pickup adds to the pack (the effect), and a full pack
//   refuses one (canAccept) — both reading trap's own state, so core never sees trap.
// - the perk contribution: grants/describes the five trap-owned perks (§7.4).
// - the supplies detector level (from the consumable-detector perk), for the merged accessor.
// See docs/mods/app-plugins-design.md.
if (isModEnabled("trap")) {
  registerHudWidget({ id: "trap", order: 0, Component: TrapHud })
  registerTrapRewardDisplay()
  registerRewardSchema("consumable", consumableRewardSchema)
  registerRewardContribution(() => {
    const trap = useTrapProgress()
    return {
      effects: {
        consumable: reward => trap.addConsumable(consumableRewardSchema.parse(reward).consumable),
      },
      canAccept: reward => reward.type !== "consumable" || !trap.isConsumablePackFull(),
    }
  })
  registerPerkContribution(() => {
    const { t } = useTranslation("treasures")
    return {
      describe: (perk: Perk) =>
        TRAP_PERKS.has(perk.type) ? { label: t(`perks.${perk.type}`, { level: perk.level ?? 1 }) } : undefined,
    }
  })
  registerDetectorLevel("supplies", () => useTrapProgress().consumableDetectorLevel)
}
