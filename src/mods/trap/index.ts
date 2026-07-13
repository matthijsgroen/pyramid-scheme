import type { ModDescriptor } from "../modDescriptor"
import { ARITHMETIC_REFLEX_META } from "./game/arithmeticReflex/meta"
import { TRAP_CONSUMABLES } from "./game/consumables"
import { HEALTH_CURRENCY_META } from "./game/healthCurrency"

// The trap mod descriptor. Owns the arithmetic-reflex trap encounter family and consumable
// placement. Toggle off by removing it from src/mods/registeredMods.ts — trap-tagged rooms then
// resolve via the family-absence pass-through (SiteMapScreen), and no consumables are placed.
//
// Game-side only (no React) — the trap challenge Component registers app-side
// (registerAllFamilies → trap/app/arithmeticReflex/plugin), gated on this mod being enabled.
// Health currency and the HUD land in later stages of Slice 3b.
export const trapMod: ModDescriptor = {
  id: "trap",
  families: [ARITHMETIC_REFLEX_META],
  consumables: TRAP_CONSUMABLES,
  currencyMeta: HEALTH_CURRENCY_META,
}
