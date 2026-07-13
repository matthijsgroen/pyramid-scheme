import type { ConsumableType, Tier } from "./types"
import type { Difficulty } from "../data/difficultyLevels"
import type { Slot } from "./slots"
import { hashStr, rollMoney } from "./rewards"
import { sellablesForDifficulty } from "../data/sellables"
import { mulberry32, shuffle } from "../game/random"

// A mod's consumable contribution: how dense (fraction of a site's puzzle slots carry one),
// which type (rarity roll), and which slots are eligible (e.g. expert+ paths only — traps arrive
// at expert). Trap owns it (src/mods/trap); when the trap mod is off no spec is injected, so no
// consumables are placed. Core keeps the per-site layout (density); the mod owns the fill + rule.
export type ConsumableSpec = {
  fraction: number
  roll: (seed: string) => ConsumableType
  eligible?: (slot: Slot) => boolean
}

// The dynamic loot pass (distribution-primitive-design.md, pass 5). Runs after gating + capped
// placement, over whatever slots are left. Junk is filler: it can go in ANY loot-bearing slot,
// filled by an eagerness ratio per slot type (docs/mods/SLICE-2-PLAN.md) — chests eagerly (all),
// puzzle slots partially, traps/gates never. Money stays core (→ shop mod, Slice 4); consumables
// are trap-owned (injected).

// Global design target: ~199/1714 puzzles carry loose money. Consumable density is the trap mod's
// own number (ConsumableSpec.fraction), so it drops with the mod.
const MONEY_FRACTION = 199 / 1714

// Junk eagerness per slot kind (docs/mods/SLICE-2-PLAN.md: chest eager100, puzzle eager60,
// gate/trap eager0). Chests take all leftover junk; puzzle chains take a fraction of their
// still-empty slots, the rest stay empty (a puzzle with no loot). Traps/gates never bear junk.
const JUNK_EAGERNESS: Record<Slot["kind"], number> = { end: 1, puzzle: 0.6 }

const byTier = (slots: Slot[]): Map<Tier, Slot[]> => {
  const m = new Map<Tier, Slot[]>()
  for (const s of slots) (m.get(s.tier) ?? m.set(s.tier, []).get(s.tier)!).push(s)
  return m
}

// Money + consumables into puzzle-chain slots, per owning site — one shuffle per site, off which
// consumables claim their eligible quota first and money claims the rest. Trap off → no consumable
// quota, so those slots fall through to empty/junk. Returns the still-empty slots.
const fillPuzzleLoot = (puzzleSlots: Slot[], consumables: ConsumableSpec | undefined): Slot[] => {
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
    // Consumables claim eligible slots (e.g. expert+ paths) first, up to their quota; money then
    // claims from what's left. Both walk the same shuffle so they stay disjoint and deterministic.
    const consumableCount = consumables ? Math.round(n * consumables.fraction) : 0
    const moneyCount = Math.round(n * MONEY_FRACTION)
    const eligibleSeqs = consumables
      ? shuffled.filter(seq => !consumables.eligible || consumables.eligible(slots[seq]))
      : []
    const consumableSeqs = new Set(eligibleSeqs.slice(0, consumableCount))
    const moneySeqs = new Set(shuffled.filter(seq => !consumableSeqs.has(seq)).slice(0, moneyCount))

    slots.forEach((slot, seq) => {
      const seed = `${siteId}:puzzleReward:${seq}`
      if (consumableSeqs.has(seq) && consumables)
        slot.assign({ type: "consumable", consumable: consumables.roll(seed) })
      else if (moneySeqs.has(seq)) slot.assign({ type: "money", amount: rollMoney(seed) })
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
// unclaimed empty puzzle slots stay empty. Clears `available`. `consumables` is the trap mod's
// spec, or undefined when trap is off.
export const assignDynamicLoot = (available: Set<Slot>, consumables?: ConsumableSpec): void => {
  const puzzle: Slot[] = []
  const chest: Slot[] = []
  for (const slot of available) (slot.kind === "puzzle" ? puzzle : chest).push(slot)
  const emptyPuzzle = fillPuzzleLoot(puzzle, consumables)
  fillJunk(chest, emptyPuzzle)
  available.clear()
}
