import type { Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import { SELLABLES_BY_TIER, SELL_VALUE_BY_TIER } from "@/data/sellables"
import { materialTierByDifficulty, type MaterialTier } from "@/data/materialTiers"
import type { Difficulty } from "@/data/difficultyLevels"
import { rollMoney } from "@/worldGen/rewards"
import { totalBuyable } from "./economyGuard"

// The shop money economy — ONE distribution owning money AND junk. Junk is money packaged as a
// sellable item (it converts back to money at a shop), so they share a single budget the shop's
// fill divides: enough money-equivalent for the player to afford the designed shop stock, but not
// extreme (or found money feels worthless). Core hands this the priority-ordered slots (chests before
// puzzles); the fill packs a mix of tier junk + loose coins to hit the budget and clears the rest
// to empty. Shop off → this distribution isn't registered → no money/junk placed. See
// docs/mods/distribution-primitive-design.md.

const BUDGET_CEILING = 1.1 // max money-equivalent placed = the floor (totalBuyable) + 10% margin
const JUNK_SHARE = 0.95 // fraction of the floor bulk junk covers; loose coins fill the rest
const PUZZLE_COIN_SHARE = 0.05 // fraction of the floor held back from chests, so solves still pay
const PER_ITEM_CAP = 20 // ≤20 of each junk collectible, so no single item floods the world
const COIN_RESERVE = 0.5 // fraction of EACH tier's slots held back from bulk junk, kept for coins
const COIN_MAX = 3 // loose change stays small so coins read as "a little extra", not a jackpot

const TIER_ORDER: MaterialTier[] = ["stone", "bronze", "silver", "gold", "divine"]

// Group the shop's allocated slots by material tier. Within a tier, slots an author tagged
// `prefers: "junk"` (a DSL `end: "junk"`) come first, so junk lands where it was asked for — the
// authoring states the preference, the mod does the placement (soft tag, not exclusive: an untagged
// slot still takes junk once the tagged ones run out). Otherwise the priority order core handed us.
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
  // so reward priority (chest-first) + the budget decide how much of the world actually bears loot.
  footprint: () => ({ min: 25, max: Number.MAX_SAFE_INTEGER }),
  fill: (slots, allConfigs) => {
    const budgetMin = totalBuyable(allConfigs)
    const budgetMax = Math.round(budgetMin * BUDGET_CEILING)
    const junkTarget = Math.round(budgetMin * JUNK_SHARE)
    const chestCeiling = budgetMax - Math.round(budgetMin * PUZZLE_COIN_SHARE)
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

    // Phase 2 — bulk junk up to the junk share of the budget, round-robin across tiers (fair
    // spread) up to the per-item cap. Junk is high-value, so it reaches the target on relatively
    // few slots — that's what carries the economy and guarantees income ≥ buyable (the self-check
    // below). Each tier keeps a COIN_RESERVE tail free of junk: without it, bulk junk drains the
    // small early tiers dry (stone has ~40 slots vs divine's ~700) and Phase 3 has nothing left
    // there, so starter/junior show no loose coins at all. The reserve costs nothing — the big
    // tiers meet the target alone.
    const junkLimit = (tier: MaterialTier, len: number) =>
      Math.max(SELLABLES_BY_TIER[tier].length, len - Math.ceil(len * COIN_RESERVE))
    const junkFill = (byTier: Map<MaterialTier, Slot[]>) => {
      const cursor = new Map(TIER_ORDER.map(t => [t, 0])) // slot index
      const placed = new Map(TIER_ORDER.map(t => [t, 0])) // junk items placed in this pass
      let progressed = true
      while (value < junkTarget && progressed) {
        progressed = false
        for (const tier of TIER_ORDER) {
          if (value >= junkTarget) break
          const tierSlots = byTier.get(tier)
          if (!tierSlots) continue
          const items = SELLABLES_BY_TIER[tier]
          let i = cursor.get(tier)!
          while (i < tierSlots.length && used.has(tierSlots[i])) i++ // skip the completeness picks
          cursor.set(tier, i)
          const n = placed.get(tier)!
          if (i >= junkLimit(tier, tierSlots.length) || n + 1 >= items.length * PER_ITEM_CAP) continue
          placeJunk(tierSlots[i], tier, n % items.length)
          cursor.set(tier, i + 1)
          placed.set(tier, n + 1)
          progressed = true
        }
      }
    }

    // Phase 3 — loose coins as flavor (1..COIN_MAX), round-robin across tiers EARLY-FIRST so every
    // present tier — especially the small starter/junior ones — shows some change before the ceiling
    // is spent. Leftover the ceiling doesn't reach stays empty (Phase 4), keeping loot meaningful.
    const coinFill = (byTier: Map<MaterialTier, Slot[]>, ceiling: number) => {
      const pools = TIER_ORDER.map(t => (byTier.get(t) ?? []).filter(s => !used.has(s)))
      for (let i = 0; ; i++) {
        let progressedCoins = false
        for (const pool of pools) {
          if (i >= pool.length) continue
          const slot = pool[i]
          // rollMoney's 1..10 is SCALED into 1..COIN_MAX, not clamped — clamping piles every roll
          // above the cap onto the cap itself, so nearly every coin comes out worth exactly COIN_MAX.
          // Also clamped to what's left of the budget, so the last coin lands the total exactly on
          // the ceiling instead of stopping a few coins short of the floor the guard checks.
          const roll = rollMoney(`${slot.siteId ?? slot.journeyId}:coin:${slot.puzzleSeq ?? 0}`)
          const amount = Math.min(1 + Math.round(((roll - 1) * (COIN_MAX - 1)) / 9), ceiling - value)
          if (amount <= 0) return
          slot.assign({ type: "money", amount })
          used.add(slot)
          value += amount
          progressedCoins = true
        }
        if (!progressedCoins) break
      }
    }

    // Chests before puzzle slots, world-wide. The tier round-robin above spreads loot WITHIN one
    // priority class; running it over the mixed list would let a small tier's puzzle slots fill
    // while a big tier's chests sit empty. Chests stop at chestCeiling — the PUZZLE_COIN_SHARE tail
    // is what keeps loose change falling on puzzle solves instead of the chests swallowing it all.
    const chestByTier = byMaterialTier(slots.filter(s => s.kind === "end"))
    const puzzleByTier = byMaterialTier(slots.filter(s => s.kind !== "end"))
    junkFill(chestByTier)
    coinFill(chestByTier, chestCeiling)
    junkFill(puzzleByTier) // only if chest capacity couldn't carry the junk target
    coinFill(puzzleByTier, budgetMax)
    coinFill(chestByTier, budgetMax) // no puzzle slots left to take the tail — chests take it back

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
