import type { ModDescriptor } from "../modDescriptor"
import { MOSAIC_CURRENCY, MOSAIC_CURRENCY_META } from "./game/mosaicCurrency"

// The mosaic mod descriptor. Minimal by design (docs/mods/TARGET.md): only the fields this mod
// actually uses. The shared ModDescriptor type lives in ../modDescriptor. Toggle the mod off by
// removing it from src/mods/registeredMods.ts's REGISTERED_MODS list.
//
// Game-side only (no React) — the descriptor must never pull in app/UI. The mosaic SCREEN is
// wired app-side (Base.tsx), gated on this mod being enabled.
export const mosaicMod: ModDescriptor = {
  id: "mosaic",
  cappedCurrencies: [MOSAIC_CURRENCY],
  currencyMeta: MOSAIC_CURRENCY_META,
}
