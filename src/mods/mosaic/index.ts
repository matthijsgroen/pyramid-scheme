import type { CappedCurrency } from "@/worldGen/placeFragments"
import { MOSAIC_CURRENCY } from "./game/mosaicCurrency"

// The mosaic mod descriptor. Minimal by design (docs/mods/TARGET.md): only the fields this mod
// actually uses today. Grow the descriptor shape (families, perks, stateSlices, hud) when a mod
// that needs those fields forces it — not before. Toggle the mod off by removing it from
// src/mods/registeredMods.ts's REGISTERED_MODS list.
export type ModDescriptor = {
  id: string
  cappedCurrencies?: CappedCurrency[]
}

export const mosaicMod: ModDescriptor = {
  id: "mosaic",
  cappedCurrencies: [MOSAIC_CURRENCY],
}
