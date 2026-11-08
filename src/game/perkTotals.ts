// How a set of earned perks folds into the numbers gameplay actually reads.
//
// A perk is DERIVED from the treasures the player holds, never banked in save state: the fold runs
// on every read, so retuning which treasure carries which perk retunes every existing save at once.
// Banking the number instead would only reach players who claim AFTER the change, with no way to
// correct the ones who claimed before. The two perks that were always derived (tier-unlock,
// location-key — read straight off the held keys) are exactly the two that never desynced.
//
// Structural perk shape, matching `Perk` in app/SiteMap/perkContributions.ts without importing it:
// this layer stays pure so the folds are testable with no React and no registry.
export type PerkLike = { type: string; level?: number }

// Every perk STACKS: each treasure carrying it is worth one stack. A detector (compass, detection)
// is built from parts the same way, so its level is the parts held, found in any order. Counting a SET of held treasures is what makes this safe: the
// old "+1 per grant" write inflated permanently if a claim was ever dispatched twice.
export const perkStacks = (perks: readonly PerkLike[], type: string, cap: number): number =>
  Math.min(cap, perks.filter(perk => perk.type === type).length)
