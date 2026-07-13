import { registerHudWidget } from "@/app/SiteMap/hudRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { TrapHud } from "./TrapHud"

// Trap's app-side registration (side-effect), self-gated on the mod being enabled. Registers the
// HUD widget (health + consumables); the reward effect for consumable pickups joins here as the
// clean-cut slice lands. See docs/mods/app-plugins-design.md.
if (isModEnabled("trap")) registerHudWidget({ id: "trap", order: 0, Component: TrapHud })
