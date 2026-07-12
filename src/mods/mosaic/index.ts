import type { CappedCurrency } from "@/worldGen/placeFragments"
import type { CurrencyMeta } from "@/game/ledger/currencyRegistry"
import { MOSAIC_CURRENCY, MOSAIC_CURRENCY_META } from "./game/mosaicCurrency"

// The mosaic mod descriptor. Minimal by design (docs/mods/TARGET.md): only the fields this mod
// actually uses today. Grow the descriptor shape (families, perks, stateSlices, ...) when a mod
// that needs those fields forces it — not before. Toggle the mod off by removing it from
// src/mods/registeredMods.ts's REGISTERED_MODS list.
//
// Game-side only (no React) — src/mods/registeredMods.ts is imported by world-gen scripts, so the
// descriptor must never pull in app/UI. The mosaic SCREEN is wired app-side (Base.tsx), gated on
// this mod being enabled.
export type ModDescriptor = {
  id: string
  cappedCurrencies?: CappedCurrency[]
  currencyMeta?: CurrencyMeta
}

export const mosaicMod: ModDescriptor = {
  id: "mosaic",
  cappedCurrencies: [MOSAIC_CURRENCY],
  currencyMeta: MOSAIC_CURRENCY_META,
}
