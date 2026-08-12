import { useMemo } from "react"

// Perk payload: an open descriptor a mod matches by its own type strings (same open rule as
// TreasureReward). `level` is present on tiered perks (compass/detection/consumable-detector/…),
// absent on stacking ones (armor/max-health/…). No shared union — each mod coins its perk ids.
export type Perk = { type: string; level?: number }

// Which perks the player has EARNED, contributed by whichever mod owns the things that carry them
// (the tomb-treasure mod folds its held ward keys through the perk table). A provider is a HOOK, so
// it reads the mod's own state; the owning mods then derive their perk levels from the merged list
// via game/perkTotals.ts. Nothing is written on claim — see perkTotals.ts for why derived beats
// banked. Same seam shape as keyProviders.ts.
export type UseEarnedPerks = () => readonly Perk[]

const earnedRegistry: UseEarnedPerks[] = []

export const registerEarnedPerks = (useEarned: UseEarnedPerks) => earnedRegistry.push(useEarned)

// Calls each provider hook in a fixed order (the registry is populated once at module load — each
// mod's app entrypoint pushes exactly once — so the hooks run in the same order every render,
// rules-of-hooks safe) and concatenates them. Order within the list never matters: every fold in
// perkTotals.ts is a max or a count.
export const useMergedEarnedPerks = (): readonly Perk[] => {
  const lists: (readonly Perk[])[] = []
  for (const useEarned of earnedRegistry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    lists.push(useEarned())
  }
  return useMemo(
    () => lists.flat(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fixed-length list of stable arrays
    lists
  )
}

// How a mod names one of its perks for the Collection, without core knowing what the perk means.
// A contribution is a HOOK (so it can read the mod's own i18n) returning describe(perk): the
// translatable bonus line, or undefined for a perk it doesn't own — the merged describe returns the
// first non-undefined. Granting is NOT here: a perk is derived from what the player holds, so there
// is nothing to apply. See docs/mods/app-plugins-design.md.
export type PerkContribution = {
  describe?: (perk: Perk) => { label: string } | undefined
}

export type UsePerkContribution = () => PerkContribution

const registry: UsePerkContribution[] = []

export const registerPerkContribution = (useContribution: UsePerkContribution) => registry.push(useContribution)

export type MergedPerkContributions = {
  describe: (perk: Perk) => { label: string } | undefined
}

// Merges every registered contribution. Calls each contribution hook in a fixed order (the registry
// is populated once at module load — each mod's app entrypoint pushes exactly once — so the hooks
// run in the same order every render, rules-of-hooks safe). describe returns the first owner's label.
export const useMergedPerkContributions = (): MergedPerkContributions => {
  const resolved: PerkContribution[] = []
  for (const useContribution of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see rewardContributions.ts
    resolved.push(useContribution())
  }
  return {
    describe: perk => {
      for (const c of resolved) {
        const d = c.describe?.(perk)
        if (d) return d
      }
      return undefined
    },
  }
}
