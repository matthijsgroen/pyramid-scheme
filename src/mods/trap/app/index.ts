import { registerHudWidget } from "@/app/SiteMap/hudRegistry"
import { registerRewardContribution } from "@/app/SiteMap/rewardContributions"
import { registerRewardSchema } from "@/app/SiteMap/rewardSchemas"
import { isModEnabled } from "@/mods/registeredMods"
import { TrapHud } from "./TrapHud"
import { useTrapProgress } from "./useTrapProgress"
import { registerTrapRewardDisplay } from "./rewardDisplay"
import { consumableRewardSchema } from "./rewardSchema"
import "./arithmeticReflex/plugin" // the trap encounter family (self-gated)

// Trap's app-side registration (side-effect), self-gated on the mod being enabled:
// - the HUD widget (health + consumables),
// - the reward contribution: a consumable pickup adds to the pack (the effect), and a full pack
//   refuses one (canAccept) — both reading trap's own state, so core never sees trap.
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
}
