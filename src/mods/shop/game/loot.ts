import type { Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import { SELLABLES_BY_TIER, SELL_VALUE_BY_TIER } from "@/data/sellables"
import { materialTierByDifficulty, type MaterialTier } from "@/data/treasures"
import type { Difficulty } from "@/data/difficultyLevels"
import { rollMoney } from "@/worldGen/rewards"
import { totalBuyable } from "./economyGuard"

// The shop money economy — ONE distribution owning money AND junk. Junk is money packaged as a
// sellable item (it converts back to money at a shop), so they share a single budget the shop's
// fill divides: enough money-equivalent for the player to afford the designed shop stock, but not
// extreme (or found money feels worthless). Core hands this the eager-ordered slots (chests before
// puzzles); the fill packs a mix of tier junk + loose coins to hit the budget and clears the rest
// to empty. Shop off → this distribution isn't registered → no money/junk placed. See
// docs/mods/distribution-primitive-design.md.

const BUDGET_CEILING = 1.5 // max money-equivalent placed = 1.5× the floor (totalBuyable)
const PER_ITEM_CAP = 20 // ≤20 of each junk collectible, so no single item floods the world
const COIN_SHARE = 0.25 // fraction of post-junk leftover slots that get loose coins (rest empty)
const COIN_MAX = 3 // loose change stays small (1–3) so coins read as "a little extra", not a jackpot

const TIER_ORDER: MaterialTier[] = ["stone", "bronze", "silver", "gold", "divine"]

// Group the shop's allocated slots by material tier. Within a tier, slots an author tagged
// `prefers: "junk"` (a DSL `end: "junk"`) come first, so junk lands where it was asked for — the
// authoring states the preference, the mod does the placement (soft tag, not exclusive: an untagged
// slot still takes junk once the tagged ones run out). Otherwise the eager order core handed us.
const byMaterialTier = (slots: Slot[]): Map<MaterialTier, Slot[]> => {
  const m = new Map<MaterialTier, Slot[]>()
  const ordered = [...slots].sort((a, b) => (a.preference === "junk" ? 0 : 1) - (b.preference === "junk" ? 0 : 1))
  for (const s of ordered) {
    const tier = materialTierByDifficulty[s.tier as Difficulty]
    ;(m.get(tier) ?? m.set(tier, []).get(tier)!).push(s)
  }
  return m
}

export const shopMoneyEconomy: Distribution = {
  id: "shop-money-economy",
  // Puzzle + chest slots that still bear loot (rewardPriority>0); junk needs a material tier, which
  // every slot has (via its difficulty). Runs after consumables, so it takes what's left.
  eligible: slot => slot.rewardPriority > 0,
  // Completeness needs ≥1 of each collectible = 25 slots minimum (hard-fail below). No ceiling —
  // the shop claims every remaining eligible slot and empties the ones its budget doesn't need,
  // so eagerness (chest-first) + the budget decide how much of the world actually bears loot.
  footprint: () => ({ min: 25, max: Number.MAX_SAFE_INTEGER }),
  fill: (slots, allConfigs) => {
    const budgetMin = totalBuyable(allConfigs)
    const budgetMax = Math.round(budgetMin * BUDGET_CEILING)
    const byTier = byMaterialTier(slots)
    const used = new Set<Slot>()
    let value = 0

    const placeJunk = (slot: Slot, tier: MaterialTier, itemIndex: number) => {
      slot.assign({ type: "sellable", itemId: SELLABLES_BY_TIER[tier][itemIndex].id })
      used.add(slot)
      value += SELL_VALUE_BY_TIER[tier]
    }

    // Phase 1 — completeness: ≥1 of each item in every tier that has slots. A present tier with
    // fewer slots than its item set can't show them all → hard-fail (grow loot capacity in the DSL).
    for (const tier of TIER_ORDER) {
      const tierSlots = byTier.get(tier)
      if (!tierSlots) continue
      const items = SELLABLES_BY_TIER[tier]
      if (tierSlots.length < items.length)
        throw new Error(
          `shop loot: tier "${tier}" has ${tierSlots.length} loot slot(s) < ${items.length} collectible(s) — ` +
            `≥1-of-each completeness impossible. Author more loot-bearing capacity in the DSL.`
        )
      items.forEach((_, i) => placeJunk(tierSlots[i], tier, i))
    }

    // Phase 2 — bulk junk up to the budget floor, round-robin across tiers (fair spread) up to the
    // per-item cap. Junk is high-value, so it reaches the floor on relatively few slots — that's
    // what carries the economy and guarantees income ≥ buyable (the self-check below).
    const cursor = new Map(TIER_ORDER.map(t => [t, SELLABLES_BY_TIER[t].length])) // start past completeness
    let progressed = true
    while (value < budgetMin && progressed) {
      progressed = false
      for (const tier of TIER_ORDER) {
        if (value >= budgetMin) break
        const tierSlots = byTier.get(tier)
        if (!tierSlots) continue
        const i = cursor.get(tier)!
        if (i >= tierSlots.length || Math.floor(i / SELLABLES_BY_TIER[tier].length) + 1 > PER_ITEM_CAP) continue
        placeJunk(tierSlots[i], tier, i % SELLABLES_BY_TIER[tier].length)
        cursor.set(tier, i + 1)
        progressed = true
      }
    }

    // Phase 3 — loose coins as flavor: sprinkle small change (1..COIN_MAX) on a share of the
    // still-unused slots so coins exist in the world without 1-coin spam, staying under the ceiling.
    const leftover = slots.filter(s => !used.has(s))
    const coinSlots = leftover.slice(0, Math.round(leftover.length * COIN_SHARE))
    for (const slot of coinSlots) {
      const amount = Math.min(COIN_MAX, rollMoney(`${slot.siteId ?? slot.journeyId}:coin:${slot.puzzleSeq ?? 0}`))
      if (value + amount > budgetMax) break
      slot.assign({ type: "money", amount })
      used.add(slot)
      value += amount
    }

    // Phase 4 — everything the budget didn't need is empty (a fragmentSlot must never serialize).
    for (const slot of slots) if (!used.has(slot)) slot.assign(undefined)

    // Self-check: the guard-relevant invariant this whole fill exists to hold.
    if (value < budgetMin)
      throw new Error(
        `shop loot: placed money-equivalent ${value} < economy floor ${budgetMin} — not enough loot ` +
          `capacity to fund the shop. Author more loot-bearing capacity in the DSL.`
      )
    if (value > budgetMax)
      throw new Error(`shop loot: placed ${value} > ceiling ${budgetMax} (BUDGET_CEILING too low or a fill bug).`)
  },
}
