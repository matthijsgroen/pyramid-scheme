import type { Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { ShopStockAssignment } from "@/worldGen/shopStock"
import type { SiteConfig } from "@/worldGen/types"
import { difficulties, difficultyCompare, type Difficulty } from "@/data/difficultyLevels"
import { trapsByTier } from "./trapRooms"

// Trap places the waterskins (docs/mods/distribution-primitive-design.md), expert and up only: starter and junior
// traps sit in optional corridors and are survived on the hearts you bring. Two kinds of slot take one:
//   - a loot-bearing PUZZLE slot, so chests and path ends never hold one. Each tier gets
//     round(WATERSKINS_PER_TRAP × that tier's trap rooms), counted off the world's trap encounters, so the water
//     follows the danger. A slot's tier is its own section difficulty, so a low-tier ward path inside a wizard tomb
//     stays ineligible. A tier with fewer slots than its share gets what it has.
//   - a tomb shop's stock placeholder tagged WATERSKIN_STOCK, WATERSKINS_PER_SHOP in every expert-and-up tomb shop,
//     on top of the trap share: Fez sells water where the traps are.
// Trap off → this distribution and the stock placeholders aren't registered → no waterskin is placed.

export const WATERSKINS_PER_TRAP = 1.3
export const WATERSKINS_PER_SHOP = 2
export const WATERSKIN_STOCK = "waterskin"
const FIRST_TIER: Difficulty = "expert"

const fromFirstTier = (tier: Difficulty) => difficultyCompare(tier, FIRST_TIER) >= 0

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

const isStock = (slot: Slot) => slot.kind === "end" && slot.preference === WATERSKIN_STOCK

/** Each tier's share of found waterskins: none below expert, round(ratio × trap rooms) from expert up. */
export const waterskinShares = (
  configs: Record<string, SiteConfig[]>,
  ratio: number = WATERSKINS_PER_TRAP
): Record<Difficulty, number> => {
  const traps = trapsByTier(configs)
  return Object.fromEntries(
    difficulties.map(tier => [tier, fromFirstTier(tier) ? Math.round(ratio * traps[tier]) : 0])
  ) as Record<Difficulty, number>
}

export const makeTrapWaterskins = (ratio: number = WATERSKINS_PER_TRAP): Distribution => ({
  id: "trap-waterskins",
  eligible: slot => fromFirstTier(slot.tier) && (isStock(slot) || (slot.kind === "puzzle" && slot.rewardPriority > 0)),
  // The rank is the quota: every stock placeholder, then each tier's share of its puzzle slots.
  footprint: () => ({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  // Tiers in difficulty order, each spread over its sites. Deterministic and seed-free.
  rank: (candidates, configs) => {
    const shares = waterskinShares(configs, ratio)
    const byTier = groupBy(
      candidates.filter(s => !isStock(s)),
      s => s.tier
    )
    return [
      ...candidates.filter(isStock),
      ...difficulties.flatMap(tier => rankTier(byTier.get(tier) ?? []).slice(0, shares[tier])),
    ]
  },
  fill: slots => {
    for (const slot of slots) slot.assign({ type: "waterskin" })
  },
})

export const trapWaterskins: Distribution = makeTrapWaterskins()

/** WATERSKINS_PER_SHOP stock placeholders in the shop of every expert-and-up tomb. */
export const waterskinShopStock = (tombs: readonly { id: string; tier: Difficulty }[]): ShopStockAssignment[] =>
  tombs
    .filter(tomb => fromFirstTier(tomb.tier))
    .flatMap(tomb =>
      Array.from({ length: WATERSKINS_PER_SHOP }, () => ({ journeyId: tomb.id, prefers: WATERSKIN_STOCK }))
    )
