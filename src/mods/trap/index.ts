import type { ModDescriptor } from "../modDescriptor"
import { ARITHMETIC_REFLEX_META } from "./game/arithmeticReflex/meta"
import { CLOCK_REFLEX_META } from "./game/clockReflex/meta"
import { CROCODILE_META } from "./game/crocodile/meta"
import { trapShopStock } from "./game/consumables"
import { trapWaterskins } from "./game/waterskins"
import { HEALTH_CURRENCY_META } from "./game/healthCurrency"

// The trap mod descriptor. Owns health, the damage traps deal and the waterskin that heals it; the
// trap encounter families (arithmetic-reflex, clock-reflex); and the crocodile capstone (a puzzle
// that spends health, so it is trap-owned — see crocodile.md §6). Toggle off by removing it from
// src/mods/registeredMods.ts — trap-tagged rooms then resolve via the family-absence pass-through
// (SiteMapScreen), and no waterskin is placed.
//
// Game-side only (no React). The app contributions — the challenge Component, the HUD widget,
// and the waterskin reward effect — register via the trap app entrypoint (src/mods/trap/app,
// pulled in by registerModApps), gated on this mod being enabled.
export const trapMod: ModDescriptor = {
  id: "trap",
  families: [ARITHMETIC_REFLEX_META, CLOCK_REFLEX_META, CROCODILE_META],
  dynamicDistributions: [trapWaterskins, trapShopStock],
  currencyMeta: HEALTH_CURRENCY_META,
}
