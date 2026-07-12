import type { ModDescriptor } from "../modDescriptor"
import { HIEROGLYPH_CURRENCY, HIEROGLYPH_CURRENCY_META } from "./game/hieroglyphCurrency"
import { TABLEAU_META } from "./game/meta"

// The hieroglyph mod descriptor. Owns the gating fragment currency, the tableau encounter
// family (whose rooms gate on holding fragments), and the fragment collection metadata — one
// toggle unit, since they can't function apart. The shared ModDescriptor type lives in
// ../modDescriptor. Toggle off by removing this from src/mods/registeredMods.ts.
//
// Game-side only (no React). The tableau room's React Component + runtime generate register
// app-side (registerAllFamilies → ./app/plugin), gated on this mod being enabled.
export const hieroglyphMod: ModDescriptor = {
  id: "hieroglyph",
  currencyDistributions: [HIEROGLYPH_CURRENCY],
  families: [TABLEAU_META],
  currencyMeta: HIEROGLYPH_CURRENCY_META,
}
