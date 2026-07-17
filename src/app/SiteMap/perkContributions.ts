// Perk payload: an open descriptor a mod matches by its own type strings (same open rule as
// TreasureReward). `level` is present on tiered perks (compass/detection/consumable-detector/…),
// absent on stacking ones (armor/max-health/…). No shared union — each mod coins its perk ids.
export type Perk = { type: string; level?: number }

// How a mod plugs perk granting + description into the tomb-treasure claim without core naming the
// perk. A contribution is a HOOK (so it can read/write the mod's own state, e.g. useTrapProgress)
// returning:
//   - grant(perk): apply the perk to the mod's OWN state; no-op for perks it doesn't own. A perk
//     has exactly one owner, so the merged grant runs every handler and only the owner reacts.
//   - describe(perk): the translatable bonus line from the owning mod's i18n, or undefined for a
//     perk it doesn't own. The merged describe returns the first non-undefined (P2 Collection use).
// Same seam shape as rewardContributions.ts — see docs/mods/app-plugins-design.md.
export type PerkContribution = {
  grant: (perk: Perk) => void
  describe?: (perk: Perk) => { label: string } | undefined
}

export type UsePerkContribution = () => PerkContribution

const registry: UsePerkContribution[] = []

export const registerPerkContribution = (useContribution: UsePerkContribution) => registry.push(useContribution)

export type MergedPerkContributions = {
  grant: (perk: Perk) => void
  describe: (perk: Perk) => { label: string } | undefined
}

// Merges every registered contribution. Calls each contribution hook in a fixed order (the registry
// is populated once at module load — each mod's app entrypoint pushes exactly once — so the hooks
// run in the same order every render, rules-of-hooks safe). grant fans out to every handler (each
// no-ops for perks it doesn't own); describe returns the first owner's label.
export const useMergedPerkContributions = (): MergedPerkContributions => {
  const resolved: PerkContribution[] = []
  for (const useContribution of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see rewardContributions.ts
    resolved.push(useContribution())
  }
  return {
    grant: perk => resolved.forEach(c => c.grant(perk)),
    describe: perk => {
      for (const c of resolved) {
        const d = c.describe?.(perk)
        if (d) return d
      }
      return undefined
    },
  }
}
