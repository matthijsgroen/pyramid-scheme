import type { CurrencyDistribution } from "@/worldGen/placeFragments"
import { HIEROGLYPH_CURRENCY } from "./tableau/game/hieroglyphCurrency"

// Every mod-owned currency that needs reachability-gated placement (docs/mods-architecture.md,
// "Currencies are mod-owned, not a closed core vocabulary") — most currencies (map pieces,
// ward keys) stay fully deterministic, authored directly at build time, and never appear
// here. src/worldGen/ can't import this file directly; scripts/generateWorld.ts (which can
// reach src/mods/) injects it into placeFragments.ts's generic worklist.
export const ALL_CURRENCY_DISTRIBUTIONS: CurrencyDistribution[] = [HIEROGLYPH_CURRENCY]
