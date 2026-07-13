import type { Tier } from "./types"
import type { Difficulty } from "../data/difficultyLevels"
import type { Slot } from "./slots"
import { GLOBAL_DEFAULTS } from "./spec/global"
import { hashStr, rollConsumable, rollMoney } from "./rewards"
import { sellablesForDifficulty } from "../data/sellables"
import { mulberry32, shuffle } from "../game/random"

// The dynamic loot pass (distribution-primitive-design.md, pass 5). Runs after gating + capped
// placement, over whatever slots are left. Junk is filler: it can go in ANY loot-bearing slot,
// filled by an eagerness ratio per slot type (docs/mods/SLICE-2-PLAN.md) — chests eagerly (all),
// puzzle slots partially, traps/gates never. Consumables + money keep to puzzle chains. Core-owned
// for now; consumables move to the trap mod (Slice 3b) and money to the shop mod (Slice 4).

// Global design target: ~441/1714 puzzles carry a consumable, ~199/1714 carry loose money.
const CONSUMABLE_FRACTION = 441 / 1714
const MONEY_FRACTION = 199 / 1714

// Junk eagerness per slot kind (docs/mods/SLICE-2-PLAN.md: chest eager100, puzzle eager60,
// gate/trap eager0). Chests take all leftover junk; puzzle chains take a fraction of their
// still-empty slots, the rest stay empty (a puzzle with no loot). Traps/gates never bear junk.
const JUNK_EAGERNESS: Record<Slot["kind"], number> = { end: 1, puzzle: 0.6 }

// ponytail: one global consumable rate (spec/global). The DSL's per-site `consumableRates`
// override is unused by any spec today; wire it onto the puzzle slot if a site ever needs its own.
const RATES = GLOBAL_DEFAULTS.consumableRates

const byTier = (slots: Slot[]): Map<Tier, Slot[]> => {
  const m = new Map<Tier, Slot[]>()
  for (const s of slots) (m.get(s.tier) ?? m.set(s.tier, []).get(s.tier)!).push(s)
  return m
}

// Money + consumables into puzzle-chain slots, per owning site — a single shuffle over a site's
// puzzle slots slices the consumable/money quotas off the front (matches the retired
// assignPuzzleRewards, so economy totals are unchanged). Returns the slots left empty, which the
// junk pass may then partially claim.
const fillPuzzleLoot = (puzzleSlots: Slot[]): Slot[] => {
  const bySite = new Map<string, Slot[]>()
  for (const slot of puzzleSlots)
    (bySite.get(slot.siteId!) ?? bySite.set(slot.siteId!, []).get(slot.siteId!)!).push(slot)

  const empty: Slot[] = []
  for (const [siteId, slots] of bySite) {
    slots.sort((a, b) => a.puzzleSeq! - b.puzzleSeq!)
    const n = slots.length
    const shuffled = shuffle(
      Array.from({ length: n }, (_, i) => i),
      mulberry32(hashStr(`${siteId}:puzzleRewards`))
    )
    const consumableCount = Math.round(n * CONSUMABLE_FRACTION)
    const moneyCount = Math.round(n * MONEY_FRACTION)
    const kindBySeq = new Map<number, "consumable" | "money">()
    shuffled.slice(0, consumableCount).forEach(i => kindBySeq.set(i, "consumable"))
    shuffled.slice(consumableCount, consumableCount + moneyCount).forEach(i => kindBySeq.set(i, "money"))

    slots.forEach((slot, seq) => {
      const seed = `${siteId}:puzzleReward:${seq}`
      const kind = kindBySeq.get(seq)
      if (kind === "consumable") slot.assign({ type: "consumable", consumable: rollConsumable(seed, RATES) })
      else if (kind === "money") slot.assign({ type: "money", amount: rollMoney(seed) })
      else empty.push(slot)
    })
  }
  return empty
}

// Junk into loot slots by eagerness: every leftover chest, plus the eager fraction of still-empty
// puzzle slots. Within each tier, round-robin over that tier's item set so every collectible
// appears (≥1-of-each completeness — the Collection "junk" category must be finishable). Round-robin
// guarantees it when a tier has at least as many junk slots as items; the assert HARD-FAILS the
// build otherwise (author more loot-bearing capacity — TARGET.md rule 2). Junk value is
// item-independent (SELL_VALUE_BY_TIER), so which item lands never shifts the economy.
const fillJunk = (chestSlots: Slot[], emptyPuzzleSlots: Slot[]): void => {
  // Eager fraction of empty puzzle slots, chosen per tier in a stable order so the pick is
  // deterministic and each tier keeps its own share (low-tier junk needs low-tier slots).
  const puzzleJunk: Slot[] = []
  for (const [, tierSlots] of byTier(emptyPuzzleSlots)) {
    const ordered = [...tierSlots].sort((a, b) =>
      a.siteId! === b.siteId! ? a.puzzleSeq! - b.puzzleSeq! : a.siteId! < b.siteId! ? -1 : 1
    )
    const take = Math.round(ordered.length * JUNK_EAGERNESS.puzzle)
    puzzleJunk.push(...ordered.slice(0, take))
  }

  for (const [tier, slots] of byTier([...chestSlots, ...puzzleJunk])) {
    const items = sellablesForDifficulty(tier as Difficulty)
    slots.forEach((slot, i) => slot.assign({ type: "sellable", itemId: items[i % items.length].id }))
    if (slots.length < items.length)
      throw new Error(
        `dynamicLoot: junk completeness — tier "${tier}" has ${slots.length} loot slot(s) < ${items.length} ` +
          `collectible(s), so not every item can appear. Author more loot-bearing capacity in the DSL.`
      )
  }
}

// Fills every remaining slot from `available` that bears loot (chests + eager puzzle share);
// unclaimed empty puzzle slots stay empty. Clears `available`.
export const assignDynamicLoot = (available: Set<Slot>): void => {
  const puzzle: Slot[] = []
  const chest: Slot[] = []
  for (const slot of available) (slot.kind === "puzzle" ? puzzle : chest).push(slot)
  const emptyPuzzle = fillPuzzleLoot(puzzle)
  fillJunk(chest, emptyPuzzle)
  available.clear()
}
