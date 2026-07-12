import type { CappedCurrency } from "@/worldGen/placeFragments"
import { mosaicMod, type ModDescriptor } from "./mosaic"

// The registered mods, in one list. A mod is "on" iff it appears here; toggle a mod off (for a
// demo, or while proving a boundary is real) by removing its entry. See docs/mods/TARGET.md —
// toggle-off is the acceptance gate: with a mod removed, `yarn generate-world` + the app must
// still build, just without that mechanic. src/worldGen/ can't import this file directly
// (core is mod-agnostic); scripts/generateWorld.ts injects the aggregated contributions.
export const REGISTERED_MODS: ModDescriptor[] = [mosaicMod]

// Every capped-filler currency any registered mod contributes, flattened for the world-gen
// placement pass. Empty for a mod set that registers none.
export const CAPPED_CURRENCIES: CappedCurrency[] = REGISTERED_MODS.flatMap(m => m.cappedCurrencies ?? [])
