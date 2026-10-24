import type { Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import { difficulties, difficultyCompare } from "@/data/difficultyLevels"

// Trap places the waterskins (docs/mods/distribution-primitive-design.md): only on expert-and-up
// PUZZLE slots that bear loot, so chests, path ends and shop stock never hold one. Starter and junior
// traps sit in optional corridors and are survived on the hearts you bring. A slot's tier is its own
// section difficulty, so a low-tier ward path inside a wizard tomb stays ineligible.
// Trap off → this distribution isn't registered → no waterskin is placed.

// The design total, capped: a waterskin is a rare find, not a supply line, and there are far more
// eligible slots than this. Fewer are placed when the world has fewer eligible slots (min 0).
export const WATERSKIN_COUNT = 60

// Round-robin over `groups`, one item from each per pass, so a small budget is shared evenly and a
// group that runs dry hands its turns to the others.
const interleave = <T>(groups: readonly (readonly T[])[]): T[] => {
  const ordered: T[] = []
  const deepest = Math.max(0, ...groups.map(g => g.length))
  for (let pass = 0; pass < deepest; pass++)
    for (const group of groups) if (pass < group.length) ordered.push(group[pass])
  return ordered
}

const groupBy = <K>(slots: readonly Slot[], key: (slot: Slot) => K): Map<K, Slot[]> => {
  const groups = new Map<K, Slot[]>()
  for (const slot of slots) {
    const k = key(slot)
    const group = groups.get(k) ?? []
    group.push(slot)
    groups.set(k, group)
  }
  return groups
}

// One tier's slots: round-robin over its sites in id order, each site's slots in path (puzzleSeq) order.
const rankTier = (slots: readonly Slot[]): Slot[] =>
  interleave(
    [...groupBy(slots, s => s.siteId ?? "").entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, site]) => [...site].sort((a, b) => (a.puzzleSeq ?? 0) - (b.puzzleSeq ?? 0)))
  )

export const trapWaterskins: Distribution = {
  id: "trap-waterskins",
  eligible: slot => slot.kind === "puzzle" && slot.rewardPriority > 0 && difficultyCompare(slot.tier, "expert") >= 0,
  footprint: () => ({ min: 0, max: WATERSKIN_COUNT }),
  // Round-robin over the tiers in difficulty order before the sites: with a small cap, the site-id
  // order alone spends the whole budget on the tiers whose sites sort first (expert and master) and
  // leaves wizard almost dry. Deterministic and seed-free.
  rank: candidates => {
    const byTier = groupBy(candidates, s => s.tier)
    return interleave(difficulties.map(tier => rankTier(byTier.get(tier) ?? [])))
  },
  fill: slots => {
    for (const slot of slots) slot.assign({ type: "waterskin" })
  },
}
