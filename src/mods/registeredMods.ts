import type { CappedCurrency, CurrencyDistribution } from "@/worldGen/placeFragments"
import type { DynamicLootSpecs } from "@/worldGen/dynamicLoot"
import type { WorldValidator } from "@/worldGen/validate"
import type { FamilyMeta } from "@/game/families/familyMeta"
import type { ModDescriptor } from "./modDescriptor"
import { mosaicMod } from "./mosaic"
import { hieroglyphMod } from "./hieroglyph"
import { trapMod } from "./trap"
import { shopMod } from "./shop"

// The registered mods, in one list. A mod is "on" iff it appears here; toggle a mod off (for a
// demo, or while proving a boundary is real) by removing its entry. See docs/mods/TARGET.md —
// toggle-off is the acceptance gate: with a mod removed, `yarn generate-world` + the app must
// still build, just without that mechanic. src/worldGen/ can't import this file directly
// (core is mod-agnostic); scripts/generateWorld.ts injects the aggregated contributions.
export const REGISTERED_MODS: ModDescriptor[] = [mosaicMod, hieroglyphMod, trapMod, shopMod]

// Every capped-filler currency any registered mod contributes, flattened for the world-gen
// phase-3 placement pass. Empty for a mod set that registers none.
export const CAPPED_CURRENCIES: CappedCurrency[] = REGISTERED_MODS.flatMap(m => m.cappedCurrencies ?? [])

// Every gating currency any registered mod contributes, for the world-gen worklist (phase 2).
// Merged with core's map-piece currency in allCurrencyDistributions.ts.
export const CURRENCY_DISTRIBUTIONS: CurrencyDistribution[] = REGISTERED_MODS.flatMap(
  m => m.currencyDistributions ?? []
)

// Every mod-contributed encounter-family meta, merged with the still-legacy family metas in
// allFamilyMeta.ts. A mod's families drop out of world-gen dispatch when it leaves this list.
export const MOD_FAMILY_META: FamilyMeta[] = REGISTERED_MODS.flatMap(m => m.families ?? [])

// The dynamic-loot contributions of all enabled mods, aggregated for the world-gen loot pass:
// consumables (trap), loose money + junk (shop). Each field is present only while its owning mod
// is registered, so toggling a mod off drops its loot. Only one mod should own each field.
export const DYNAMIC_LOOT: DynamicLootSpecs = {
  consumables: REGISTERED_MODS.find(m => m.consumables)?.consumables,
  money: REGISTERED_MODS.find(m => m.money)?.money,
  junk: REGISTERED_MODS.find(m => m.junk)?.junk,
}

// Every post-build world validator any registered mod contributes (e.g. the shop economy guard),
// run last in buildConfigs over the whole grown world. A validator drops with its mod.
export const MOD_WORLD_VALIDATORS: WorldValidator[] = REGISTERED_MODS.flatMap(m =>
  m.worldValidator ? [m.worldValidator] : []
)

// Is a mod enabled? The single toggle point the app side consults (Base.tsx, registerCurrencies)
// so a mod's screen + currency-meta drop out together when it leaves REGISTERED_MODS.
export const isModEnabled = (id: string): boolean => REGISTERED_MODS.some(m => m.id === id)
