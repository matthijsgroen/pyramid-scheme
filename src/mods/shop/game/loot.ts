import type { Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { TreasureReward } from "@/worldGen/types"
import { reachableGrounds } from "@/worldGen/grounds"
import { SELLABLES_BY_TIER, SELL_VALUE_BY_TIER } from "@/data/sellables"
import { materialTierByDifficulty, type MaterialTier } from "@/data/materialTiers"
import type { Difficulty } from "@/data/difficultyLevels"
import { rollMoney } from "@/worldGen/rewards"
import { GROUND_CAP, incomeOf, stockPrices } from "./economyGuard"
import { moneyLedger } from "./moneyLedger"
import { PURCHASES, type PurchaseTable } from "./purchases"

// The shop money economy — ONE distribution owning money AND junk. Junk is money packaged as a sellable item (it
// converts back to money at a shop), so both count as income. It fills last, after every fixed quantity, and places by
// the grounds the economy guard checks (grounds.ts): in every ground a player can stand in, the money lying there covers
// everything for sale there with a margin, so no order of buying strands a player short of a key. Shop off → this
// distribution isn't registered → no money/junk placed. See docs/mods/distribution-primitive-design.md.

const MARGIN = 1.1 // each ground's money is placed up to what its shops sell × this
const LOOSE_CHANGE_SHARE = 0.12 // loose coins on puzzle solves, as a share of everything for sale, laid before the grounds
const COIN_SLOT_SHARE = 0.5 // the most of a tier's puzzle slots loose change takes, so junk the grounds need finds room
const PER_ITEM_CAP = 20 // ≤20 of each junk collectible per tier, so no single item floods the world
const COIN_MAX = 3 // loose change stays small so coins read as "a little extra", not a jackpot

const TIER_ORDER: MaterialTier[] = ["stone", "bronze", "silver", "gold", "divine"]

const tierOf = (slot: Slot): MaterialTier => materialTierByDifficulty[slot.tier as Difficulty]
const levelOf = (slot: Slot) => `${slot.ref.journeyId}:${slot.ref.levelIndex}`

// Group the shop's allocated slots by material tier. Within a tier, slots an author tagged
// `prefers: "junk"` (a DSL `end: "junk"`) come first, so junk lands where it was asked for — the
// authoring states the preference, the mod does the placement (soft tag, not exclusive: an untagged
// slot still takes junk once the tagged ones run out). Otherwise the priority order core handed us.
const byMaterialTier = (slots: Slot[]): Map<MaterialTier, Slot[]> => {
  const m = new Map<MaterialTier, Slot[]>()
  const ordered = [...slots].sort((a, b) => (a.preference === "junk" ? 0 : 1) - (b.preference === "junk" ? 0 : 1))
  for (const s of ordered) {
    const tier = tierOf(s)
    ;(m.get(tier) ?? m.set(tier, []).get(tier)!).push(s)
  }
  return m
}

/** What a ground holds for the fill: the slots its rooms reach, the income already lying there, and what it sells. */
type Target = { label: string; slots: Slot[]; income: number; buyable: number }

export const makeShopMoneyEconomy = (purchases: PurchaseTable = PURCHASES): Distribution => ({
  id: "shop-money-economy",
  // Puzzle + chest slots that still bear loot (rewardPriority>0); junk needs a material tier, which every slot has (via
  // its difficulty). Fills last, after every fixed quantity, so it takes what is left and covers the stock the others
  // put in the shops.
  eligible: slot => slot.rewardPriority > 0,
  fillsLast: true,
  // Completeness needs ≥1 of each collectible = 25 slots minimum (hard-fail below). No ceiling —
  // the shop claims every remaining eligible slot and empties the ones its grounds don't need,
  // so reward priority (chest-first) + the grounds decide how much of the world actually bears loot.
  footprint: () => ({ min: 25, max: Number.MAX_SAFE_INTEGER }),
  fill: (slots, allConfigs, ctx) => {
    if (!ctx) throw new Error("shop loot: the money fill places by the gate walk, and it was handed none.")

    // Every ground, walked while each slot still holds its placeholder: a ground lists a slot's placeholder when it
    // reaches the slot's room, so a slot in a hidden section counts only for grounds that hold what reveals it.
    const found = reachableGrounds(ctx.walk, { isKey: ctx.isKey, cap: GROUND_CAP })
    if (!("grounds" in found))
      throw new Error(
        `shop loot: more than ${GROUND_CAP} ways to stand in the world (${found.overCap} walk states seen).`
      )
    const slotOf = new Map<TreasureReward, Slot>()
    for (const slot of slots) if (slot.sentinel) slotOf.set(slot.sentinel, slot)
    const slotsIn = (rewards: readonly TreasureReward[]) =>
      rewards.flatMap(reward => {
        const slot = slotOf.get(reward)
        return slot ? [slot] : []
      })
    const priceOf = stockPrices(allConfigs, purchases)
    const grounds: Target[] = moneyLedger(found.grounds, priceOf, incomeOf).map((row, i) => ({
      label: row.label,
      slots: slotsIn(found.grounds[i].rewards),
      income: row.income,
      buyable: row.buyable,
    }))
    // The world: every room any ground reaches and everything any ground's shops sell.
    const everyReward = [...new Set(found.grounds.flatMap(g => g.rewards))]
    const everyStock = [...new Set(found.grounds.flatMap(g => g.stock))]
    const world: Target = {
      label: "everything",
      slots: slotsIn(everyReward),
      income: everyReward.reduce((sum, r) => sum + incomeOf(r), 0),
      buyable: everyStock.reduce((sum, r) => sum + priceOf(r), 0),
    }
    // How many grounds reach each slot: money for a ground goes first where fewest other grounds reach.
    const reach = new Map<Slot, number>()
    for (const ground of grounds) for (const slot of ground.slots) reach.set(slot, (reach.get(slot) ?? 0) + 1)

    const placed = new Map<Slot, number>()
    const junkPlaced = new Map<MaterialTier, number>()
    const junkLeft = (slot: Slot) =>
      (junkPlaced.get(tierOf(slot)) ?? 0) < SELLABLES_BY_TIER[tierOf(slot)].length * PER_ITEM_CAP
    // The tier's collectibles in turn, so each is placed about as often as the others.
    const placeJunk = (slot: Slot): number => {
      const tier = tierOf(slot)
      const items = SELLABLES_BY_TIER[tier]
      const n = junkPlaced.get(tier) ?? 0
      slot.assign({ type: "sellable", itemId: items[n % items.length].id })
      junkPlaced.set(tier, n + 1)
      placed.set(slot, SELL_VALUE_BY_TIER[tier])
      return SELL_VALUE_BY_TIER[tier]
    }
    // rollMoney's 1..10 is SCALED into 1..COIN_MAX, not clamped — clamping piles every roll above the cap onto the cap
    // itself, so nearly every coin comes out worth exactly COIN_MAX.
    const placeCoin = (slot: Slot, most = COIN_MAX): number => {
      const roll = rollMoney(`${slot.siteId ?? slot.journeyId}:coin:${slot.puzzleSeq ?? 0}`)
      const amount = Math.min(1 + Math.round(((roll - 1) * (COIN_MAX - 1)) / 9), most)
      slot.assign({ type: "money", amount })
      placed.set(slot, amount)
      return amount
    }

    // Phase 1 — completeness: ≥1 of each item in every tier that has slots. A present tier with
    // fewer slots than its item set can't show them all → hard-fail (grow loot capacity in the DSL).
    //
    // Spread across levels: the first N slots of a tier's list are all on the same floor (the list
    // arrives in priority order, so one floor's chests sit together), and a tier whose money runs
    // to completeness ALONE — the small early tiers — would then keep its whole collectible set on
    // that one floor, behind whatever gate or hidden path it happens to have. One missed floor, one
    // unfinishable Collection row. So take one slot per level before returning to a level already
    // used, falling back to any free slot when the levels run out.
    const byTier = byMaterialTier(slots)
    for (const tier of TIER_ORDER) {
      const tierSlots = byTier.get(tier)
      if (!tierSlots) continue
      const items = SELLABLES_BY_TIER[tier]
      if (tierSlots.length < items.length)
        throw new Error(
          `shop loot: tier "${tier}" has ${tierSlots.length} loot slot(s) < ${items.length} collectible(s) — ` +
            `≥1-of-each completeness impossible. Author more loot-bearing capacity in the DSL.`
        )
      const levelsUsed = new Set<string>()
      const free = (s: Slot) => !placed.has(s)
      const chest = (s: Slot) => s.kind === "end"
      const freshLevel = (s: Slot) => !levelsUsed.has(levelOf(s))
      items.forEach(() => {
        // Chest-before-puzzle still wins (as everywhere else); the level spread only picks WHICH
        // chest. Falling all the way through to a puzzle slot means the tier has fewer chests than
        // collectibles — rare, and better than skipping a collectible.
        const slot =
          tierSlots.find(s => free(s) && chest(s) && freshLevel(s)) ??
          tierSlots.find(s => free(s) && chest(s)) ??
          tierSlots.find(free)!
        levelsUsed.add(levelOf(slot))
        placeJunk(slot)
      })
    }

    // Phase 2 — loose change on puzzle solves, round-robin across tiers EARLY-FIRST so every present tier — the small
    // starter/junior ones especially — shows some change. Only in rooms some ground reaches, and in at most
    // COIN_SLOT_SHARE of a tier's puzzle slots.
    const changeBudget = Math.round(world.buyable * LOOSE_CHANGE_SHARE)
    let change = 0
    const puzzlesByTier = byMaterialTier(slots.filter(s => s.kind === "puzzle" && reach.has(s)))
    const pools = TIER_ORDER.map(tier => {
      const pool = puzzlesByTier.get(tier) ?? []
      return pool.filter(s => !placed.has(s)).slice(0, Math.floor(pool.length * COIN_SLOT_SHARE))
    })
    const looseChange = new Set<Slot>()
    for (let i = 0; change < changeBudget; i++) {
      const row = pools.filter(pool => i < pool.length)
      if (row.length === 0) break
      for (const pool of row) {
        if (change >= changeBudget) break
        change += placeCoin(pool[i], changeBudget - change)
        looseChange.add(pool[i])
      }
    }

    // Phase 3 — each ground, the smallest first, then the world: junk (coins once a tier's junk is spent) in the
    // ground's free slots until its money reaches what it sells × MARGIN. The slots fewest grounds reach go first, so
    // the money for a shop lies where that shop is, then authored junk ends, then chests before puzzles, taking each
    // level in turn. Once its free slots run out, its loose change gives way to junk, which is worth more in every
    // ground that reaches the slot. A ground still short of what it sells then fails the build.
    const order = (candidates: Slot[]): Slot[] => {
      const rank = (s: Slot) => [reach.get(s) ?? 0, s.preference === "junk" ? 0 : 1, -s.rewardPriority]
      const byRank = (a: Slot, b: Slot) => {
        const [ra, rb] = [rank(a), rank(b)]
        return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
      }
      const sorted = [...candidates].sort(byRank)
      const turn = new Map<Slot, number>()
      const seen = new Map<string, number>()
      for (const s of sorted) {
        const key = `${rank(s).join(",")}|${levelOf(s)}`
        const n = seen.get(key) ?? 0
        seen.set(key, n + 1)
        turn.set(s, n)
      }
      const index = new Map(sorted.map((s, i) => [s, i]))
      return sorted.sort((a, b) => byRank(a, b) || turn.get(a)! - turn.get(b)! || index.get(a)! - index.get(b)!)
    }
    const smallestFirst = [...grounds].sort((a, b) => a.slots.length - b.slots.length)
    for (const target of [...smallestFirst, world]) {
      const goal = Math.ceil(target.buyable * MARGIN)
      let income = target.slots.reduce((sum, s) => sum + (placed.get(s) ?? 0), target.income)
      for (const slot of order(target.slots.filter(s => !placed.has(s)))) {
        if (income >= goal) break
        income += junkLeft(slot) ? placeJunk(slot) : placeCoin(slot)
      }
      for (const slot of order(target.slots.filter(s => looseChange.has(s)))) {
        if (income >= goal) break
        if (!junkLeft(slot)) continue
        income -= placed.get(slot)!
        looseChange.delete(slot)
        income += placeJunk(slot)
      }
      if (income < target.buyable)
        throw new Error(
          `shop loot: with ${target.label} bought, income ${income} is short of buyable ${target.buyable} by ` +
            `${target.buyable - income}, and no free loot slot is left in reach. Author more loot-bearing capacity there.`
        )
    }

    // Phase 4 — every slot the grounds didn't need is empty: no placeholder may reach the serializer.
    for (const slot of slots) if (!placed.has(slot)) slot.assign(undefined)
  },
})

export const shopMoneyEconomy = makeShopMoneyEconomy()
