import type { Distribution } from "@/worldGen/slotAllocator"
import { hashStr } from "@/worldGen/rewards"
import { rollConsumable } from "./consumableTypes"
import { difficultyCompare } from "@/data/difficultyLevels"

// Trap owns consumables (docs/mods/distribution-primitive-design.md): how many, which type
// (rarity), and where. Consumables sit only on expert+ PUZZLE slots; chest ends stay money/junk.
// Note starter and junior DO have traps (all in hidden, optional corridors) — they simply get no
// supply, so their traps are survived on the health you brought. A slot's tier is its own section
// difficulty (Part B), so a low-tier ward path deep in a wizard tomb is still ineligible.
// Trap off → this distribution isn't registered → no consumables placed.
const RATES = { bandage: 3, oil: 1, trapTool: 1 }

// Design consumable count (tunable, feel-only — consumables don't enter the economy guard). The
// allocator hands the trap mod up to this many of the highest-ranked eligible slots; fewer if the
// world has fewer eligible expert+ puzzle slots (no hard-fail — min 0). There are ~1335 eligible
// slots, so this cap is what actually decides the total: it maps 1:1 to consumables in the world.
const CONSUMABLE_COUNT = 150

export const trapConsumables: Distribution = {
  id: "trap-consumables",
  eligible: slot => slot.kind === "puzzle" && slot.rewardPriority > 0 && difficultyCompare(slot.tier, "expert") >= 0,
  footprint: () => ({ min: 0, max: CONSUMABLE_COUNT }),
  // Round-robin across sites: one slot from each site per pass, so the budget is shared evenly
  // instead of being drained by whichever sites sort first. Each tier then gets a share proportional
  // to how many sites it has.
  //
  // This replaces a `hashStr(siteId:puzzleSeq)` sort that claimed to do the same and did the
  // opposite. hashStr is a length-sensitive polynomial hash, so a puzzleSeq gaining a second digit
  // moves the key by ~10⁹ ("expert_1:0:9" → 317596241, "expert_1:0:10" → 1255548679) — it sorted by
  // site-name hash and digit count, not evenly. The budget went to the first ten slots of each
  // expert site and never reached master, which ended up with ZERO consumables across all four of
  // its journeys while expert ran at 62% fill.
  //
  // Deterministic and seed-free: sites in id order, slots within a site in puzzleSeq order.
  rank: candidates => {
    const bySite = new Map<string, (typeof candidates)[number][]>()
    for (const slot of candidates) {
      const key = slot.siteId ?? ""
      const group = bySite.get(key) ?? []
      group.push(slot)
      bySite.set(key, group)
    }
    const groups = [...bySite.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, slots]) => [...slots].sort((a, b) => (a.puzzleSeq ?? 0) - (b.puzzleSeq ?? 0)))
    const ordered: (typeof candidates)[number][] = []
    const deepest = Math.max(0, ...groups.map(g => g.length))
    for (let pass = 0; pass < deepest; pass++) for (const group of groups) if (group[pass]) ordered.push(group[pass])
    return ordered
  },
  fill: slots => {
    for (const slot of slots)
      slot.assign({
        type: "consumable",
        consumable: rollConsumable(`${slot.siteId}:consumable:${slot.puzzleSeq}`, RATES),
      })
  },
}

// Trap also stocks the Fez shops: every shop stock slot the currency mods didn't claim is filled
// with a FINITE consumable (no per-visit refresh — sold-out = sold-out; docs/mods/ARCHITECTURE.md (shop mod)).
// Shop slots are rewardPriority 0 so the loot passes never touch them; this distribution
// targets them explicitly by encounter. The currency stock slots were already claimed (removed from
// `available`) by the capped/gating pass, so only the empty ones remain eligible here. Trap off →
// not registered → shop stock slots fall empty (the shop just sells fewer things).
export const trapShopStock: Distribution = {
  id: "trap-shop-consumables",
  eligible: slot => slot.encounter === "fez-shop",
  footprint: () => ({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  // Keeps the plain hash sort (unlike trapConsumables above): with no budget ceiling this takes every
  // eligible slot, so the order can't starve anyone — it only decides which shop gets which item.
  rank: candidates =>
    [...candidates].sort((a, b) => hashStr(`${a.siteId}:${a.puzzleSeq}`) - hashStr(`${b.siteId}:${b.puzzleSeq}`)),
  fill: slots => {
    for (const slot of slots)
      slot.assign({
        type: "consumable",
        consumable: rollConsumable(`${slot.siteId}:shopstock:${slot.puzzleSeq}`, RATES),
      })
  },
}
