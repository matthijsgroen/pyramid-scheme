import type { ModDescriptor } from "../modDescriptor"
import { HIEROGLYPH_CURRENCY, HIEROGLYPH_CURRENCY_META } from "./game/hieroglyphCurrency"
import { TABLEAU_META } from "./game/meta"
import { hieroglyphCoverageValidator } from "./game/fragmentFinalize"
import { HIEROGLYPH_REQUIRED } from "./game/hieroglyphData"

// The hieroglyph mod descriptor. Owns the gating fragment currency, the tableau encounter
// family (whose rooms gate on holding fragments), and the fragment collection metadata — one
// toggle unit, since they can't function apart. The shared ModDescriptor type lives in
// ../modDescriptor. Toggle off by removing this from src/mods/registeredMods.ts.
//
// Game-side only (no React). The tableau room's React Component + runtime generate register
// app-side (registerModApps → ./app/plugin), gated on this mod being enabled.
export const hieroglyphMod: ModDescriptor = {
  id: "hieroglyph",
  currencyDistributions: [HIEROGLYPH_CURRENCY],
  families: [TABLEAU_META],
  currencyMeta: HIEROGLYPH_CURRENCY_META,
  worldValidator: hieroglyphCoverageValidator(HIEROGLYPH_REQUIRED),
  // Sell one fragment at each of these tombs' Fez shops (a `prefers:"hieroglyph"` sentinel the
  // gating worklist fills with a real, detectable fragment — moved out of the free-world spread).
  // Mirrors the pre-slice shop stock. Drops with the mod (hieroglyph off → these stay unfilled and
  // the shop slot falls back to empty).
  shopStock: [
    { journeyId: "junior_treasure_tomb", prefers: "hieroglyph" },
    { journeyId: "wizard_treasure_tomb", prefers: "hieroglyph" },
    { journeyId: "wizard_treasure_tomb_b", prefers: "hieroglyph" },
    { journeyId: "expert_treasure_tomb", prefers: "hieroglyph" },
    { journeyId: "expert_treasure_tomb_b", prefers: "hieroglyph" },
    { journeyId: "master_treasure_tomb", prefers: "hieroglyph" },
  ],
}
