import type { ModDescriptor } from "../modDescriptor"
import { MOSAIC_CURRENCIES, MOSAIC_CURRENCY_METAS, mosaicBucket } from "./game/mosaicCurrency"

// The mosaic mod descriptor. Minimal by design (docs/mods/TARGET.md): only the fields this mod
// actually uses. The shared ModDescriptor type lives in ../modDescriptor. Toggle the mod off by
// removing it from src/mods/registeredMods.ts's REGISTERED_MODS list.
//
// Game-side only (no React) — the descriptor must never pull in app/UI. The mosaic SCREEN is
// wired app-side (Base.tsx), gated on this mod being enabled.
export const mosaicMod: ModDescriptor = {
  id: "mosaic",
  cappedCurrencies: MOSAIC_CURRENCIES,
  currencyMeta: MOSAIC_CURRENCY_METAS,
  // Sell one mosaic piece at each of these tombs' Fez shops (a `prefers` sentinel the capped pass
  // fills — moved out of the free-world spread, total unchanged). The piece is the tomb's own
  // difficulty, since that is the only pool allowed to take a node of that tier. Drops with the mod.
  shopStock: [
    { journeyId: "junior_treasure_tomb", prefers: mosaicBucket("junior") },
    { journeyId: "wizard_treasure_tomb", prefers: mosaicBucket("wizard") },
    { journeyId: "wizard_treasure_tomb_b", prefers: mosaicBucket("wizard") },
    { journeyId: "wizard_treasure_tomb_c", prefers: mosaicBucket("wizard") },
    { journeyId: "expert_treasure_tomb", prefers: mosaicBucket("expert") },
    { journeyId: "master_treasure_tomb", prefers: mosaicBucket("master") },
  ],
}
