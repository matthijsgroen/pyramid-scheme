import type { CappedCurrency, CurrencyDistribution } from "@/worldGen/placeFragments"
import type { ConsumableSpec } from "@/worldGen/dynamicLoot"
import type { CurrencyMeta } from "@/game/ledger/currencyRegistry"
import type { FamilyMeta } from "@/game/families/familyMeta"

// A mod is a container registered as one unit in src/mods/registeredMods.ts's REGISTERED_MODS.
// A mod is "on" iff it appears there; toggle it off (for a demo, or while proving a boundary is
// real) by removing its entry. See docs/mods/TARGET.md — toggle-off is the acceptance gate:
// with a mod removed, `yarn generate-world` + the app must still build, just without that
// mechanic.
//
// Game-side only (no React) — registeredMods.ts is imported by world-gen scripts, so the
// descriptor must never pull in app/UI. A mod's SCREEN / room Component is wired app-side
// (Base.tsx, registerModApps), gated on the mod being enabled. Fields grow as slices need
// them — do not add a field before a mod that uses it.
export type ModDescriptor = {
  id: string
  // Capped-filler currencies that never gate progress (phase-3 placement) — e.g. mosaic tiles.
  cappedCurrencies?: CappedCurrency[]
  // Gating currencies discovered on the reachability worklist (phase 2) — e.g. hieroglyph
  // fragments. Injected into placeFragments' worklist via allCurrencyDistributions.ts.
  currencyDistributions?: CurrencyDistribution[]
  // Game-side encounter-family metadata (tags, rewardWeight, resolveKeyRequirements). The
  // React Component + runtime generate register app-side (registerModApps), gated on this
  // mod — this descriptor stays React-free. Merged into allFamilyMeta.ts.
  families?: FamilyMeta[]
  // Currency display/ownership metadata for the ledger + collection UI — one or many.
  currencyMeta?: CurrencyMeta | CurrencyMeta[]
  // Consumable placement this mod owns (density + rarity roll) — the dynamic loot pass fills the
  // consumable-role puzzle slots with it. Drops when the mod leaves REGISTERED_MODS (trap off →
  // no consumables placed). Only one registered mod should contribute this.
  consumables?: ConsumableSpec
}
