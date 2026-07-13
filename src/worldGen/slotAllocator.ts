import type { SiteConfig } from "./types"
import type { Slot } from "./slots"
import type { CappedCurrency } from "./placeFragments"

// The loot placement primitive (docs/mods/distribution-primitive-design.md). A Distribution
// claims loot slots by a footprint (how many), an eligibility filter (which), and a rank
// (priority among eligible — composed from distribution.ts's pipe/rankBy/preferThenRelax);
// CORE allocates the slots, the MOD fills them — so core never rolls a variant or knows a
// currency's meaning. Capped currencies are the degenerate exact-footprint case (min === max);
// money/junk/consumables (later steps) are flexible.
export type Footprint = { min: number; max: number }

export type Distribution = {
  id: string
  // How many slots core should hand this distribution. Exact (min === max) for a fixed total.
  footprint: (allConfigs: Record<string, SiteConfig[]>) => Footprint
  // Which slots core may allocate to it (default: any). The encounter↔loot join lives here
  // (e.g. shop stock → shop slots, consumables → expert+ paths) — unused until those land.
  eligible?: (slot: Slot) => boolean
  // Priority among eligible slots when contended (default: natural order).
  rank?: (candidates: readonly Slot[]) => Slot[]
  // Core hands the mod its allocated slots; the mod bakes rewards (owns variants/rarity/
  // completeness). Core does not inspect the contents.
  fill: (allocatedSlots: Slot[]) => void
}

// Allocate `available` slots to each distribution (footprint + eligibility + rank), remove the
// taken slots from `available`, and hand them to the mod's fill. Hard-fails if a distribution's
// `min` can't be met — capped/required loot must fully place (keys-and-locks-solver.md,
// "Exhausted relaxation is a build failure").
//
// ponytail: greedy per-distribution (each takes up to its max in list order). Fine while at most
// one flexible distribution competes for a given slot pool; upgrade to min-first-across-all
// (place every distribution's min before anyone grows toward max) when multiple dynamic
// distributions contend for the same slots (design doc §placement, Increment 1 step 3).
export const allocateDistributions = (
  available: Set<Slot>,
  distributions: readonly Distribution[],
  allConfigs: Record<string, SiteConfig[]>
): void => {
  for (const dist of distributions) {
    const { min, max } = dist.footprint(allConfigs)
    const eligible = [...available].filter(s => dist.eligible?.(s) ?? true)
    const ranked = dist.rank ? dist.rank(eligible) : eligible
    const take = ranked.slice(0, max)
    if (take.length < min) {
      throw new Error(
        `slotAllocator: distribution "${dist.id}" unplaceable — needed ${min}, only ${take.length} ` +
          `eligible loot node(s). Author more loot-bearing capacity in the DSL.`
      )
    }
    for (const slot of take) available.delete(slot)
    dist.fill(take)
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
  rank: c.rank,
  fill: slots => {
    for (const slot of slots) slot.assign(c.toReward())
  },
})
