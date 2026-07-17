import type { CurrencyDistribution } from "@/worldGen/placeFragments"
import { CURRENCY_DISTRIBUTIONS } from "./registeredMods"

// Every gating currency registered with the worklist solver — all mod-owned (each registered
// mod's currencyDistributions: the tomb-treasure mod's map pieces, the hieroglyph mod's
// fragments, …). Core world-gen enumerates none; ward keys stay fully deterministic
// (siteAssembler's own construction-time key chain; harvested, never placed by this solver) and
// never appear here. src/worldGen/ can't import this file directly; scripts/generateWorld.ts
// (which can reach src/mods/) injects it into placeFragments.ts's generic worklist. A mod's
// gating currency drops out here when it leaves REGISTERED_MODS.
export const ALL_CURRENCY_DISTRIBUTIONS: CurrencyDistribution[] = [...CURRENCY_DISTRIBUTIONS]
