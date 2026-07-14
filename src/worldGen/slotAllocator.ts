import type { SiteConfig } from "./types"
import type { Slot } from "./slots"
import type { CappedCurrency } from "./placeFragments"

// The loot placement primitive (docs/mods/distribution-primitive-design.md). A Distribution
// claims loot slots by a footprint (how many), an eligibility filter (which), and a rank
// (priority among eligible — composed from distribution.ts's pipe/rankBy/preferThenRelax);
// CORE allocates the slots, the MOD fills them — so core never rolls a variant or knows a
// currency's meaning. Capped currencies are the degenerate exact-footprint case (min === max);
// the dynamic distributions (trap consumables, shop money economy) are flexible.
export type Footprint = { min: number; max: number }

export type Distribution = {
  id: string
  // How many slots core should hand this distribution. Exact (min === max) for a fixed total.
  footprint: (allConfigs: Record<string, SiteConfig[]>) => Footprint
  // Which slots core may allocate to it (default: any). The encounter↔loot join lives here —
  // e.g. consumables filter on `slot.rewardWeight > 0 && tier >= expert`; the shop takes any
  // loot-eligible (`rewardWeight > 0`) slot.
  eligible?: (slot: Slot) => boolean
  // Priority among eligible slots when contended (default: natural order).
  rank?: (candidates: readonly Slot[]) => Slot[]
  // Core hands the mod its allocated slots (+ the whole world, e.g. so the shop can size its money
  // budget from the authored shop prices); the mod bakes rewards, owns variants/rarity/completeness,
  // and clears any claimed-but-unused slot to empty (`assign(undefined)`). Core does not inspect it.
  fill: (allocatedSlots: Slot[], allConfigs: Record<string, SiteConfig[]>) => void
}

// Allocate `available` slots to each distribution (footprint + eligibility + rank), remove the
// taken slots from `available`, and hand them to the mod's fill. Hard-fails if a distribution's
// `min` can't be met — capped/required loot must fully place (keys-and-locks-solver.md,
// "Exhausted relaxation is a build failure").
//
// Eagerness (docs/mods/distribution-primitive-design.md): candidates are offered in
// `rewardWeight`-desc order (chest 100 before puzzle 60), so eager slots fill first and a
// distribution that can't take everything leaves the least-eager slots empty. `emptyFraction`
// reserves that share up front — the least-eager loot-eligible slots are skimmed and left empty
// before anyone distributes, so found loot stays meaningful (no 1-coin spam). Slots of
// `rewardWeight === 0` are loot-ineligible and simply never match a distribution's `eligible`.
//
// ponytail: greedy per-distribution (each takes up to its max in list order). Fine while at most
// one distribution with a nonzero `min` competes for a given slot pool; upgrade to
// min-first-across-all (place every distribution's min before anyone grows toward max) when a
// second nonzero-min distribution contends for the same slots (design doc §placement, Increment 2).
export const allocateDistributions = (
  available: Set<Slot>,
  distributions: readonly Distribution[],
  allConfigs: Record<string, SiteConfig[]>,
  emptyFraction = 0
): void => {
  if (emptyFraction > 0) {
    // Least-eager loot-eligible slots first (puzzle before chest), so the reserved-empty share
    // lands on low-eagerness slots. Stable within a weight (collectSlots order) → deterministic.
    const eligible = [...available].filter(s => s.rewardWeight > 0).sort((a, b) => a.rewardWeight - b.rewardWeight)
    for (const slot of eligible.slice(0, Math.round(eligible.length * emptyFraction))) available.delete(slot)
  }
  for (const dist of distributions) {
    const { min, max } = dist.footprint(allConfigs)
    // Eager order is the default; dist.rank refines within it (Array.sort is stable).
    const eligible = [...available]
      .filter(s => dist.eligible?.(s) ?? true)
      .sort((a, b) => b.rewardWeight - a.rewardWeight)
    const ranked = dist.rank ? dist.rank(eligible) : eligible
    const take = ranked.slice(0, max)
    if (take.length < min) {
      throw new Error(
        `slotAllocator: distribution "${dist.id}" unplaceable — needed ${min}, only ${take.length} ` +
          `eligible loot node(s). Author more loot-bearing capacity in the DSL.`
      )
    }
    for (const slot of take) available.delete(slot)
    dist.fill(take, allConfigs)
  }
}

// Adapts a legacy CappedCurrency to a Distribution (exact footprint = its total). Lets the
// phase-3 capped pass run through the unified allocator with no behavior change, ahead of mods
// contributing Distributions directly (design doc Increment 1 step 3).
export const cappedToDistribution = (c: CappedCurrency): Distribution => ({
  id: c.bucket,
  footprint: allConfigs => {
    const total = c.totalRequired(allConfigs)
    return { min: total, max: total }
  },
  // Capped currencies are path-end rewards only; puzzle-chain slots are filler-only (dynamic pass).
  eligible: s => s.kind === "end",
  rank: c.rank,
  fill: (slots: Slot[]) => {
    for (const slot of slots) slot.assign(c.toReward())
  },
})
