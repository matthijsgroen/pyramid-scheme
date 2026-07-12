import type { CurrencyDistribution } from "@/worldGen/placeFragments"
import { MAP_PIECE_CURRENCY } from "@/worldGen/mapPieceCurrency"
import { HIEROGLYPH_CURRENCY } from "./hieroglyph/game/hieroglyphCurrency"

// Every currency registered with the worklist solver — core (map pieces, every tomb needs
// one regardless of mods) and mod-owned (hieroglyph fragments, docs/mods-architecture.md's
// "Currencies are mod-owned, not a closed core vocabulary") side by side. Ward keys stay
// fully deterministic (siteAssembler's own construction-time key chain; harvested, never
// placed by this solver) and never appear here. src/worldGen/ can't import this file
// directly; scripts/generateWorld.ts (which can reach src/mods/) injects it into
// placeFragments.ts's generic worklist.
export const ALL_CURRENCY_DISTRIBUTIONS: CurrencyDistribution[] = [MAP_PIECE_CURRENCY, HIEROGLYPH_CURRENCY]
