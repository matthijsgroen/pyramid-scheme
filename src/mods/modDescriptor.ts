import type { CappedCurrency, CurrencyDistribution } from "@/worldGen/placeFragments"
import type { ReachabilitySupport } from "@/worldGen/reachability"
import type { TombTreasureResolver } from "@/worldGen/configBuilder"
import type { Distribution } from "@/worldGen/slotAllocator"
import type { WorldValidator } from "@/worldGen/validate"
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
  // Game-side encounter-family metadata (tags, rewardPriority, resolveKeyRequirements). The
  // React Component + runtime generate register app-side (registerModApps), gated on this
  // mod — this descriptor stays React-free. Merged into allFamilyMeta.ts.
  families?: FamilyMeta[]
  // Currency display/ownership metadata for the ledger + collection UI — one or many.
  currencyMeta?: CurrencyMeta | CurrencyMeta[]
  // Dynamic-loot distributions this mod owns (the unified loot primitive): each claims slots by
  // footprint/eligibility/rank and fills them itself (owns variants/rarity/completeness) — e.g.
  // trap consumables, the shop money economy. Drops when the mod leaves REGISTERED_MODS (trap off
  // → no consumables; shop off → no money/junk, leftover chests fall empty). See
  // docs/mods/distribution-primitive-design.md.
  dynamicDistributions?: Distribution[]
  // Post-build world validator (e.g. the shop economy guard) — a global balance check run over
  // the whole grown world in buildConfigs. Drops with the mod, so core names no mod balance rule.
  worldValidator?: WorldValidator
  // Currency-specific facts the world-gen reachability model needs but core must not name (§E):
  // a reward→bucket harvest, a journey's currency entry lock (tomb map pieces), the tier-unlock
  // ladder. Merged across mods and injected into buildConfigs. The tomb-treasure mod supplies it;
  // it drops with the mod. See docs/mods/SLICE-E-ward-keys.md.
  reachabilitySupport?: ReachabilitySupport
  // Maps a tomb's treasure-stream position → the reward placed there (the tomb-treasure mod's
  // `tombKey` perk stream). Injected into buildConfigs so core world-gen names no reward type;
  // drops with the mod (a tomb-less world places no tomb treasures). One provider expected.
  resolveTombTreasure?: TombTreasureResolver
}
