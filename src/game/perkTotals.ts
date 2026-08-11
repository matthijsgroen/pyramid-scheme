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

// A TIERED perk (compass, consumable-detector, scribes-eye, detection) states the level it grants;
// holding several means the best one wins, so re-earning a lower tier can never demote you.
export const perkLevel = (perks: readonly PerkLike[], type: string, cap: number): number =>
  Math.min(
    cap,
    perks.reduce((best, perk) => (perk.type === type ? Math.max(best, perk.level ?? 1) : best), 0)
  )

// A STACKING perk (max-health, armor, trap-insight, pack-mule) grants no level — each treasure
// carrying it is worth one stack. Counting a SET of held treasures is what makes this safe: the
// old "+1 per grant" write inflated permanently if a claim was ever dispatched twice.
export const perkStacks = (perks: readonly PerkLike[], type: string, cap: number): number =>
  Math.min(cap, perks.filter(perk => perk.type === type).length)
