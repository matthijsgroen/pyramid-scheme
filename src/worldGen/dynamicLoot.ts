import type { ConsumableType, Tier } from "./types"
import type { Slot } from "./slots"
import { hashStr, rollMoney } from "./rewards"
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

// A mod's loose-money contribution: how dense (fraction of a site's puzzle slots carry money).
// Shop owns it (src/mods/shop); when the shop mod is off no spec is injected, so no loose money is
// placed. The amount itself is a core-ledger currency value (rollMoney), so it stays core.
export type MoneySpec = { fraction: number }

// A mod's junk (sellable filler) contribution: how eager each slot kind is to bear junk, and the
// item set to round-robin per tier. Shop owns it (src/mods/shop); when the shop mod is off no spec
// is injected, so no junk is placed and leftover chests fall empty.
export type JunkSpec = {
  eagerness: Record<Slot["kind"], number>
  itemsForTier: (tier: Tier) => { id: string }[]
}

// The set of dynamic-loot contributions the registered mods inject, aggregated in
// registeredMods.ts and threaded through generateWorld → buildConfigs → placeFragments. Each field
// is present only when an enabled mod contributes it; a missing field means that loot isn't placed.
export type DynamicLootSpecs = {
  consumables?: ConsumableSpec
  money?: MoneySpec
  junk?: JunkSpec
}

// The dynamic loot pass (distribution-primitive-design.md, pass 5). Runs after gating + capped
// placement, over whatever slots are left. Junk is filler: it can go in ANY loot-bearing slot,
// filled by an eagerness ratio per slot type (docs/mods/SLICE-2-PLAN.md) — chests eagerly (all),
// puzzle slots partially, traps/gates never. Money (shop), junk (shop) and consumables (trap) are
// all mod-injected: an absent spec places none of that loot.

const byTier = (slots: Slot[]): Map<Tier, Slot[]> => {
  const m = new Map<Tier, Slot[]>()
  for (const s of slots) (m.get(s.tier) ?? m.set(s.tier, []).get(s.tier)!).push(s)
  return m
}

// Money + consumables into puzzle-chain slots, per owning site — one shuffle per site, off which
// consumables claim their eligible quota first and money claims the rest. Trap off → no consumable
// quota; shop off → no money quota; those slots fall through to empty/junk. Returns the still-empty
// slots.
const fillPuzzleLoot = (
  puzzleSlots: Slot[],
  consumables: ConsumableSpec | undefined,
  money: MoneySpec | undefined
): Slot[] => {
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
    const moneyCount = money ? Math.round(n * money.fraction) : 0
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
const fillJunk = (chestSlots: Slot[], emptyPuzzleSlots: Slot[], junk: JunkSpec): void => {
  // Eager fraction of empty puzzle slots, chosen per tier in a stable order so the pick is
  // deterministic and each tier keeps its own share (low-tier junk needs low-tier slots).
  const puzzleJunk: Slot[] = []
  for (const [, tierSlots] of byTier(emptyPuzzleSlots)) {
    const ordered = [...tierSlots].sort((a, b) =>
      a.siteId! === b.siteId! ? a.puzzleSeq! - b.puzzleSeq! : a.siteId! < b.siteId! ? -1 : 1
    )
    const take = Math.round(ordered.length * junk.eagerness.puzzle)
    puzzleJunk.push(...ordered.slice(0, take))
  }

  for (const [tier, slots] of byTier([...chestSlots, ...puzzleJunk])) {
    const items = junk.itemsForTier(tier)
    slots.forEach((slot, i) => slot.assign({ type: "sellable", itemId: items[i % items.length].id }))
    if (slots.length < items.length)
      throw new Error(
        `dynamicLoot: junk completeness — tier "${tier}" has ${slots.length} loot slot(s) < ${items.length} ` +
          `collectible(s), so not every item can appear. Author more loot-bearing capacity in the DSL.`
      )
  }
}

// Fills every remaining slot from `available` that bears loot (chests + eager puzzle share);
// unclaimed empty puzzle slots stay empty. Clears `available`. Each spec in `specs` is present
// only when its owning mod is enabled: shop off → no money/junk (leftover chests fall empty),
// trap off → no consumables.
export const assignDynamicLoot = (available: Set<Slot>, specs: DynamicLootSpecs = {}): void => {
  const puzzle: Slot[] = []
  const chest: Slot[] = []
  for (const slot of available) (slot.kind === "puzzle" ? puzzle : chest).push(slot)
  const emptyPuzzle = fillPuzzleLoot(puzzle, specs.consumables, specs.money)
  if (specs.junk) fillJunk(chest, emptyPuzzle, specs.junk)
  // Shop off (no junk spec): leftover chests bear no filler, so clear their fragmentSlot sentinels
  // to empty path ends — a fragmentSlot must never reach the serializer. Empty puzzle slots are
  // already undefined (never assigned), so only the end/chest placeholders need clearing.
  else for (const slot of chest) slot.assign(undefined)
  available.clear()
}
