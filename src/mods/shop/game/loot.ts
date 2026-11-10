import type { Distribution } from "@/worldGen/slotAllocator"
import type { Slot } from "@/worldGen/slots"
import type { SiteConfig, SubSection, Tier, TreasureReward } from "@/worldGen/types"
import { reachableGrounds, type Ground } from "@/worldGen/grounds"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "@/worldGen/data"
import { TIER_LADDER } from "@/worldGen/reachability"
import { SELLABLES_BY_TIER, SELL_VALUE_BY_TIER } from "@/data/sellables"
import { materialTierByDifficulty, type MaterialTier } from "@/data/materialTiers"
import type { Difficulty } from "@/data/difficultyLevels"
import { rollMoney } from "@/worldGen/rewards"
import { GROUND_CAP, incomeOf, stockPrices } from "./economyGuard"
import { PURCHASES, type PurchaseTable } from "./purchases"
import RELEASED_LOOT from "@/data/releasedLoot.json"

// The shop money economy — ONE distribution owning money AND junk. Junk is money packaged as a sellable item (it
// converts back to money at a shop), so both count as income. It fills last, after every fixed quantity, and places by
// the grounds the economy guard checks (grounds.ts): in every ground a player can stand in, the money lying there covers
// everything for sale there with a margin, so no order of buying strands a player short of a key. Shop off → this
// distribution isn't registered → no money/junk placed. See docs/mods/distribution-primitive-design.md.
//
// The fill is TIER-LOCAL: it runs a journey tier at a time, starter first, and a tier's fill sees only what that tier
// and the tiers below it hold — their rooms, their money, their shops' stock. A tier is the journey's tier (the unit
// src/data/tierFingerprints.json guards), never a section's own difficulty. So re-authoring a higher tier can never
// move a lower tier's money; only a lower tier's money, which a higher tier's grounds count as income, reaches up.
// A released tier's outcome is not filled at all: src/data/releasedLoot.json holds it slot by slot.

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

/** What a ground holds for one tier's fill: the slots its rooms reach (that tier's and the ones below), the money
 * already lying there in rooms that are no slot, and what its shops sell. */
type Target = { label: string; slots: Slot[]; fixedIncome: number; buyable: number }

/** A released tier's money and junk, by slot address; a slot the record does not name holds nothing. */
export type ReleasedLoot = Partial<Record<Tier, Record<string, TreasureReward>>>

/** The journey tier of a journey id, or undefined for one the world does not know. */
export type JourneyTierOf = (journeyId: string) => Tier | undefined

const WORLD_JOURNEY_TIERS = new Map<string, Tier>([...PYRAMID_JOURNEYS, ...TOMB_JOURNEYS].map(j => [j.id, j.tier]))
const worldJourneyTier: JourneyTierOf = journeyId => WORLD_JOURNEY_TIERS.get(journeyId)

const rank = (tier: Tier) => TIER_LADDER.indexOf(tier)

// Every reward object the configs hold, with its journey's tier and its place, so the fill can tell which tier a
// reward or a piece of stock belongs to, and order things by where they stand rather than by how a walk met them.
const rewardPlaces = (
  allConfigs: Record<string, SiteConfig[]>,
  journeyTier: JourneyTierOf
): Map<TreasureReward, { tier: Tier; at: string }> => {
  const places = new Map<TreasureReward, { tier: Tier; at: string }>()
  for (const [journeyId, sites] of Object.entries(allConfigs)) {
    const tier = journeyTier(journeyId)
    if (tier === undefined) continue
    const note = (r: TreasureReward | undefined, at: string) => {
      if (r) places.set(r, { tier, at })
    }
    const section = (s: SubSection & { sideSections?: SubSection[] }, at: string) => {
      s.rewards?.forEach((r, i) => note(r, `${at}/p${i}`))
      note(s.endReward, `${at}/end`)
      s.sideSections?.forEach((sub, m) => section(sub, `${at}/s${m}`))
    }
    sites.forEach((floors, level) =>
      floors.forEach((floor, f) => {
        const at = `${journeyId}/${level}/${f}`
        floor.rewards?.forEach((r, i) => note(r, `${at}/p${i}`))
        note(floor.mainEndReward, `${at}/mainEnd`)
        floor.sideSections.forEach((s, k) => section(s, `${at}/s${k}`))
      })
    )
  }
  return places
}

export const makeShopMoneyEconomy = (
  purchases: PurchaseTable = PURCHASES,
  {
    released = RELEASED_LOOT as ReleasedLoot,
    journeyTier = worldJourneyTier,
  }: {
    released?: ReleasedLoot
    journeyTier?: JourneyTierOf
  } = {}
): Distribution => ({
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
    const places = rewardPlaces(allConfigs, journeyTier)
    const slotTier = (slot: Slot): Tier => {
      const tier = journeyTier(slot.journeyId)
      if (tier === undefined) throw new Error(`shop loot: journey "${slot.journeyId}" has no tier.`)
      return tier
    }
    // A slot's place among its own tier's slots, in the order core handed them: what orders one tier's slots never
    // depends on another tier's.
    const indexOf = new Map(slots.map((slot, i) => [slot, i]))
    const slotOf = new Map<TreasureReward, Slot>()
    for (const slot of slots) if (slot.sentinel) slotOf.set(slot.sentinel, slot)
    const priceOf = stockPrices(allConfigs, purchases)

    const placed = new Map<Slot, number>()
    const junkPlaced = new Map<MaterialTier, number>()
    const itemsPlaced = new Set<string>()
    const junkLeft = (slot: Slot) =>
      (junkPlaced.get(tierOf(slot)) ?? 0) < SELLABLES_BY_TIER[tierOf(slot)].length * PER_ITEM_CAP
    const placeSellable = (slot: Slot, itemId: string, tier: MaterialTier): number => {
      slot.assign({ type: "sellable", itemId })
      junkPlaced.set(tier, (junkPlaced.get(tier) ?? 0) + 1)
      itemsPlaced.add(itemId)
      placed.set(slot, SELL_VALUE_BY_TIER[tier])
      return SELL_VALUE_BY_TIER[tier]
    }
    // The tier's collectibles in turn, so each is placed about as often as the others.
    const placeJunk = (slot: Slot): number => {
      const tier = tierOf(slot)
      const items = SELLABLES_BY_TIER[tier]
      return placeSellable(slot, items[(junkPlaced.get(tier) ?? 0) % items.length].id, tier)
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

    // A released tier: every slot as the record holds it. A record that names no slot, or a chest the record leaves
    // empty, means the tier's slots moved under a frozen outcome, and the build stops.
    const applyReleased = (tier: Tier, tierSlots: Slot[], record: Record<string, TreasureReward>) => {
      const named = new Set<string>()
      for (const slot of tierSlots) {
        const reward = slot.address === undefined ? undefined : record[slot.address]
        if (reward === undefined) {
          if (slot.kind === "end")
            throw new Error(
              `shop loot: released ${tier} chest ${slot.address ?? slot.journeyId} has no loot in src/data/releasedLoot.json.`
            )
          slot.assign(undefined)
          continue
        }
        named.add(slot.address!)
        if (reward.type === "sellable") {
          const itemId = String(reward.itemId)
          const material = (Object.keys(SELLABLES_BY_TIER) as MaterialTier[]).find(m =>
            SELLABLES_BY_TIER[m].some(item => item.id === itemId)
          )
          if (!material) throw new Error(`shop loot: released ${tier} loot names unknown sellable "${itemId}".`)
          placeSellable(slot, itemId, material)
        } else {
          slot.assign({ ...reward })
          placed.set(slot, incomeOf(reward))
        }
      }
      const lost = Object.keys(record).filter(address => !named.has(address))
      if (lost.length > 0)
        throw new Error(
          `shop loot: released ${tier} loot in src/data/releasedLoot.json stands on no slot the fill was handed: ${lost.join(", ")}.`
        )
    }

    const fillTier = (tier: Tier, tierSlots: Slot[]) => {
      const visible = (reward: TreasureReward): boolean => {
        const place = places.get(reward)
        return place !== undefined && rank(place.tier) <= rank(tier)
      }
      const own = new Set(tierSlots)
      // A ground as this tier sees it: only what it and the tiers below hold. Grounds that read the same are one.
      const project = (label: string, ground: Pick<Ground, "rewards" | "stock">): Target & { key: string } => {
        const rewards = ground.rewards.filter(visible)
        const inReach = rewards.flatMap(r => {
          const slot = slotOf.get(r)
          return slot ? [slot] : []
        })
        const stock = ground.stock.filter(visible)
        const at = (r: TreasureReward) => places.get(r)!.at
        return {
          label,
          slots: inReach.sort((a, b) => indexOf.get(a)! - indexOf.get(b)!),
          fixedIncome: rewards.filter(r => !slotOf.has(r)).reduce((sum, r) => sum + incomeOf(r), 0),
          buyable: stock.reduce((sum, r) => sum + priceOf(r), 0),
          key: `${rewards.map(at).sort().join(",")}|${stock.map(at).sort().join(",")}`,
        }
      }
      const seen = new Set<string>()
      const grounds = found.grounds.flatMap(ground => {
        const target = project(
          ground.bought.length === 0 ? "nothing" : ground.bought.map(r => String(r.id ?? r.type)).join(", "),
          ground
        )
        if (seen.has(target.key)) return []
        seen.add(target.key)
        return [target]
      })
      const world = project("everything", {
        rewards: [...new Set(found.grounds.flatMap(g => g.rewards))],
        stock: [...new Set(found.grounds.flatMap(g => g.stock))],
      })
      const ownStock = [...new Set(found.grounds.flatMap(g => g.stock))].filter(r => places.get(r)?.tier === tier)
      // How many grounds reach each of this tier's slots: money for a ground goes first where fewest other grounds reach.
      const reach = new Map<Slot, number>()
      for (const ground of grounds)
        for (const slot of ground.slots) if (own.has(slot)) reach.set(slot, (reach.get(slot) ?? 0) + 1)

      // Phase 1 — completeness: ≥1 of each of the tier's own collectibles (its material tier's), in the slots of that
      // material, unless a lower tier already placed one. A section of another difficulty inside the tier's journeys
      // carries its own material's junk but never owes that set. Fewer slots than the collectibles still missing →
      // hard-fail (grow loot capacity in the DSL).
      //
      // Spread across levels: the first N slots of a tier's list are all on the same floor (the list
      // arrives in priority order, so one floor's chests sit together), and a tier whose money runs
      // to completeness ALONE — the small early tiers — would then keep its whole collectible set on
      // that one floor, behind whatever gate or hidden path it happens to have. One missed floor, one
      // unfinishable Collection row. So take one slot per level before returning to a level already
      // used, falling back to any free slot when the levels run out.
      {
        const material = materialTierByDifficulty[tier]
        const materialSlots = byMaterialTier(tierSlots).get(material) ?? []
        const missing = SELLABLES_BY_TIER[material].filter(item => !itemsPlaced.has(item.id))
        if (materialSlots.length < missing.length)
          throw new Error(
            `shop loot: tier "${material}" has ${materialSlots.length} loot slot(s) < ${missing.length} collectible(s) — ` +
              `≥1-of-each completeness impossible. Author more loot-bearing capacity in the DSL.`
          )
        const levelsUsed = new Set<string>()
        const free = (s: Slot) => !placed.has(s)
        const chest = (s: Slot) => s.kind === "end"
        const freshLevel = (s: Slot) => !levelsUsed.has(levelOf(s))
        for (const item of missing) {
          // Chest-before-puzzle still wins (as everywhere else); the level spread only picks WHICH
          // chest. Falling all the way through to a puzzle slot means the tier has fewer chests than
          // collectibles — rare, and better than skipping a collectible.
          const slot =
            materialSlots.find(s => free(s) && chest(s) && freshLevel(s)) ??
            materialSlots.find(s => free(s) && chest(s)) ??
            materialSlots.find(free)!
          levelsUsed.add(levelOf(slot))
          placeSellable(slot, item.id, material)
        }
      }

      // Phase 2 — loose change on puzzle solves, round-robin across the material tiers this tier's slots carry, early
      // first. Sized by what this tier's own shops sell, only in rooms some ground reaches, and in at most
      // COIN_SLOT_SHARE of a material tier's puzzle slots.
      const changeBudget = Math.round(ownStock.reduce((sum, r) => sum + priceOf(r), 0) * LOOSE_CHANGE_SHARE)
      let change = 0
      const puzzlesByTier = byMaterialTier(tierSlots.filter(s => s.kind === "puzzle" && reach.has(s)))
      const pools = TIER_ORDER.map(material => {
        const pool = puzzlesByTier.get(material) ?? []
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

      // Phase 3 — each ground, the smallest first, then the world: junk (coins once a tier's junk is spent) in this
      // tier's free slots of the ground until its money reaches what it sells × MARGIN. The slots fewest grounds reach
      // go first, so the money for a shop lies where that shop is, then authored junk ends, then chests before puzzles,
      // taking each level in turn. Once its free slots run out, its loose change gives way to junk, which is worth more
      // in every ground that reaches the slot. A ground still short of what it sells then fails the build.
      const order = (candidates: Slot[]): Slot[] => {
        const rankOf = (s: Slot) => [reach.get(s) ?? 0, s.preference === "junk" ? 0 : 1, -s.rewardPriority]
        const byRank = (a: Slot, b: Slot) => {
          const [ra, rb] = [rankOf(a), rankOf(b)]
          return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
        }
        const sorted = [...candidates].sort(byRank)
        const turn = new Map<Slot, number>()
        const seenRank = new Map<string, number>()
        for (const s of sorted) {
          const key = `${rankOf(s).join(",")}|${levelOf(s)}`
          const n = seenRank.get(key) ?? 0
          seenRank.set(key, n + 1)
          turn.set(s, n)
        }
        const index = new Map(sorted.map((s, i) => [s, i]))
        return sorted.sort((a, b) => byRank(a, b) || turn.get(a)! - turn.get(b)! || index.get(a)! - index.get(b)!)
      }
      const ownIn = (target: Target) => target.slots.filter(s => own.has(s)).length
      const smallestFirst = [...grounds].sort(
        (a, b) => ownIn(a) - ownIn(b) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
      )
      for (const target of [...smallestFirst, world]) {
        const goal = Math.ceil(target.buyable * MARGIN)
        let income = target.slots.reduce((sum, s) => sum + (placed.get(s) ?? 0), target.fixedIncome)
        for (const slot of order(target.slots.filter(s => own.has(s) && !placed.has(s)))) {
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

      // Phase 4 — no placeholder may reach the serializer. A puzzle the grounds didn't need is left empty; a chest gets
      // loose change, because an end without a reward is a free end the carve may pick as a key host, so emptying it
      // after the layout was picked would move the floor's walls.
      for (const slot of tierSlots) {
        if (placed.has(slot)) continue
        if (slot.kind === "end") placeCoin(slot)
        else slot.assign(undefined)
      }
    }

    for (const tier of TIER_LADDER) {
      const tierSlots = slots.filter(slot => slotTier(slot) === tier)
      const record = released[tier]
      if (record) applyReleased(tier, tierSlots, record)
      else if (tierSlots.length > 0) fillTier(tier, tierSlots)
    }
  },
})

export const shopMoneyEconomy = makeShopMoneyEconomy()
