import type { CurrencyDistribution } from "@/worldGen/placeFragments"
import { MAP_PIECE_CURRENCY } from "@/worldGen/mapPieceCurrency"
import { CURRENCY_DISTRIBUTIONS } from "./registeredMods"

// Every currency registered with the worklist solver — core (map pieces, every tomb needs
// one regardless of mods) and mod-owned (each registered mod's currencyDistributions, e.g.
// hieroglyph fragments) side by side. Ward keys stay fully deterministic (siteAssembler's own
// construction-time key chain; harvested, never placed by this solver) and never appear here.
// src/worldGen/ can't import this file directly; scripts/generateWorld.ts (which can reach
// src/mods/) injects it into placeFragments.ts's generic worklist. A mod's gating currency
// drops out here when it leaves REGISTERED_MODS.
export const ALL_CURRENCY_DISTRIBUTIONS: CurrencyDistribution[] = [MAP_PIECE_CURRENCY, ...CURRENCY_DISTRIBUTIONS]
