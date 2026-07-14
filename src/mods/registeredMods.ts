import type { CappedCurrency, CurrencyDistribution } from "@/worldGen/placeFragments"
import type { ReachabilitySupport } from "@/worldGen/reachability"
import type { TombTreasureResolver } from "@/worldGen/configBuilder"
import type { Distribution } from "@/worldGen/slotAllocator"
import type { WorldValidator } from "@/worldGen/validate"
import type { FamilyMeta } from "@/game/families/familyMeta"
import type { ModDescriptor } from "./modDescriptor"
import { puzzleMod } from "./puzzle"
import { mosaicMod } from "./mosaic"
import { hieroglyphMod } from "./hieroglyph"
import { trapMod } from "./trap"
import { shopMod } from "./shop"
import { tombTreasureMod } from "./tombTreasure"

// The registered mods, in one list. A mod is "on" iff it appears here; toggle a mod off (for a
// demo, or while proving a boundary is real) by removing its entry. See docs/mods/TARGET.md —
// toggle-off is the acceptance gate: with a mod removed, `yarn generate-world` + the app must
// still build, just without that mechanic. src/worldGen/ can't import this file directly
// (core is mod-agnostic); scripts/generateWorld.ts injects the aggregated contributions.
export const REGISTERED_MODS: ModDescriptor[] = [puzzleMod, mosaicMod, hieroglyphMod, trapMod, shopMod, tombTreasureMod]

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

// Every dynamic-loot distribution all enabled mods contribute, in registry order (trap consumables
// before the shop money economy — consumables claim their expert+ puzzle slots first, then the shop
// takes what's left). A distribution drops when its mod leaves REGISTERED_MODS: shop off → no
// money/junk, trap off → no consumables.
export const DYNAMIC_DISTRIBUTIONS: Distribution[] = REGISTERED_MODS.flatMap(m => m.dynamicDistributions ?? [])

// Every post-build world validator any registered mod contributes (e.g. the shop economy guard),
// run last in buildConfigs over the whole grown world. A validator drops with its mod.
export const MOD_WORLD_VALIDATORS: WorldValidator[] = REGISTERED_MODS.flatMap(m =>
  m.worldValidator ? [m.worldValidator] : []
)

// Every mod's reachability support (§E), merged into one — the currency-specific facts core
// reachability must not name (tomb-key harvest, tomb map-piece entry lock, tier-unlock ladder).
// Each hook tries every contributing mod and takes the first defined answer; with no contributor
// (or a mod toggled off) it returns undefined, so core reachability falls back to "no lock" —
// generic and mod-agnostic. Injected into buildConfigs by scripts/generateWorld.ts.
const REACHABILITY_SUPPORTS: ReachabilitySupport[] = REGISTERED_MODS.flatMap(m =>
  m.reachabilitySupport ? [m.reachabilitySupport] : []
)
const firstDefined = <T>(values: (T | undefined)[]): T | undefined => values.find(v => v !== undefined)
export const MOD_REACHABILITY_SUPPORT: ReachabilitySupport = {
  thresholdFor: bucket => firstDefined(REACHABILITY_SUPPORTS.map(s => s.thresholdFor?.(bucket))),
  bucketForReward: reward => firstDefined(REACHABILITY_SUPPORTS.map(s => s.bucketForReward?.(reward))),
  journeyEntryLock: journeyId => firstDefined(REACHABILITY_SUPPORTS.map(s => s.journeyEntryLock?.(journeyId))),
  tierUnlockBucket: tier => firstDefined(REACHABILITY_SUPPORTS.map(s => s.tierUnlockBucket?.(tier))),
}

// The tomb-treasure content resolver (§E): maps a tomb's floor position → its `tombKey` reward, so
// core world-gen names no reward type. First contributing mod wins (one provider expected); with
// none (mod off), buildConfigs places no tomb treasures. Injected by scripts/generateWorld.ts.
export const MOD_TOMB_TREASURE_RESOLVER: TombTreasureResolver | undefined = REGISTERED_MODS.map(
  m => m.resolveTombTreasure
).find(r => r !== undefined)

// Is a mod enabled? The single toggle point the app side consults (Base.tsx, registerCurrencies)
// so a mod's screen + currency-meta drop out together when it leaves REGISTERED_MODS.
export const isModEnabled = (id: string): boolean => REGISTERED_MODS.some(m => m.id === id)
