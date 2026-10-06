import { describe, it, expect } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { SiteConfig, TreasureReward } from "./types"
import { ALL_SELLABLES, SELLABLES_BY_TIER } from "@/data/sellables"

// Invariant guard for the loot economy — asserts the MODEL over the whole shipped world, not any
// count. The model (docs/mods/ARCHITECTURE.md "Placement pipeline"): every loot-eligible slot is
// offered in reward-priority order, CHESTS FIRST, then puzzles; each provider fills its own count;
// whatever's left at the bottom is empty. Consequence — the one property worth guarding:
//
//   A treasure chest is empty ONLY if the loot budget ran out — and then puzzle slots (lower
//   priority) hold none of that same loot. So an empty chest WHILE a puzzle bears the chest-first
//   loot (junk) means priority order broke or a provider misbehaved.
//
// Empty chests as such are legitimate: the shop's money economy places a FIXED money-equivalent
// total (what its stock costs, loot.ts), so once that budget is spent the remaining chests are
// empty by design. Two kinds of puzzle-slot loot are exempt because they never compete for a
// chest: trap consumables (`kind: "puzzle"` eligibility only), and the shop's PUZZLE_COIN_SHARE —
// a slice of the budget deliberately withheld from chests so solving a puzzle still pays out.
//
// This is the check that was missing: the suite verified reward COUNTS (golden guard), which
// TARGET.md §35 says is explicitly NOT the acceptance gate. Counts stayed green while empty chests
// shipped. An invariant over the generated world catches that drift; golden counts never will.

// A treasure chest = a path end authored `end: "treasure"` that is meant to hold loot. A fez-shop
// section also authors `end: "treasure"`, but there the SHOP is the treasure (its stock lives in
// `rewards[]`), so its end legitimately bears no `endReward` — exempt those.
const isShopSection = (s: { encounter?: string | string[] }) => s.encounter === "fez-shop"

type Counts = { emptyChests: string[]; filledPuzzleSlots: number }

const auditWorld = (configs: Record<string, SiteConfig[]>): Counts => {
  const emptyChests: string[] = []
  let filledPuzzleSlots = 0

  const countPuzzleFills = (rewards: (TreasureReward | undefined)[] | undefined) => {
    for (const r of rewards ?? []) if (r?.type === "sellable") filledPuzzleSlots++
  }

  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      floors.forEach((floor, fi) => {
        // A floor whose main path EXITS ends in a treasure chest; a staircase floor goes up stairs
        // (no terminal chest), so only exit floors carry a main-path chest to check.
        if (floor.exitOrStaircase === "exit" && floor.mainEndReward === undefined)
          emptyChests.push(`${siteId}#${fi} main`)
        countPuzzleFills(floor.rewards)

        for (const s of floor.sideSections) {
          if (s.end === "treasure" && s.endReward === undefined && !isShopSection(s))
            emptyChests.push(`${siteId}#${fi} side`)
          countPuzzleFills(s.rewards)
          for (const sub of s.sideSections ?? []) {
            if (sub.end === "treasure" && sub.endReward === undefined && !isShopSection(sub))
              emptyChests.push(`${siteId}#${fi} sub`)
            countPuzzleFills(sub.rewards)
          }
        }
      })
    }
  }
  return { emptyChests, filledPuzzleSlots }
}

// Where each sellable id was placed, keyed by "journeyId#levelIndex" — the unit a player either
// clears or doesn't. A whole tier's collectibles sitting on ONE level is a single point of failure
// for its Collection row.
const sellableLevels = (configs: Record<string, SiteConfig[]>): Map<string, Set<string>> => {
  const found = new Map<string, Set<string>>()
  const note = (level: string, r: TreasureReward | undefined) => {
    if (r?.type !== "sellable") return
    const id = String(r.itemId)
    ;(found.get(id) ?? found.set(id, new Set()).get(id)!).add(level)
  }
  const noteAll = (level: string, rewards: (TreasureReward | undefined)[] | undefined) => {
    for (const r of rewards ?? []) note(level, r)
  }

  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    siteConfigs.forEach((floors, levelIndex) => {
      const level = `${siteId}#${levelIndex}`
      for (const floor of floors) {
        note(level, floor.mainEndReward)
        noteAll(level, floor.rewards)
        for (const s of floor.sideSections) {
          note(level, s.endReward)
          noteAll(level, s.rewards)
          for (const sub of s.sideSections ?? []) {
            note(level, sub.endReward)
            noteAll(level, sub.rewards)
          }
        }
      }
    })
  }
  return found
}

describe("loot economy invariants (over the generated world)", () => {
  const { emptyChests, filledPuzzleSlots } = auditWorld(generatedWorldConfigs)
  const placed = sellableLevels(generatedWorldConfigs)

  it("fills chests before puzzles: no empty chest while any puzzle bears loot", () => {
    // If puzzle slots are filled, the priority order guarantees every (higher-priority) chest is
    // filled too. An empty chest here means the model broke — not a genuine loot shortage.
    if (filledPuzzleSlots > 0) {
      expect(
        emptyChests,
        `${emptyChests.length} empty chest(s) while ${filledPuzzleSlots} puzzle slots bear junk — ` +
          `priority order (chests first) was violated. First few: ${emptyChests.slice(0, 8).join("; ")}`
      ).toEqual([])
    }
  })

  // The shop fill guarantees ≥1 of each collectible per tier against the slots it is HANDED. This
  // asserts the guarantee survived into the shipped world — the Collection's junk row can only be
  // finished if every id is actually out there. The unit spec (dynamicDistributions) covers the
  // algorithm on synthetic slots; only this sees the real one.
  it("places every sellable at least once, so the Collection's junk row can be completed", () => {
    const missing = ALL_SELLABLES.filter(item => !placed.has(item.id)).map(item => item.id)
    expect(missing, `unobtainable collectible(s): ${missing.join(", ")}`).toEqual([])
  })

  // A tier whose budget runs to completeness alone gets exactly one copy of each of its items, and
  // the slots it is handed cluster on one floor (they arrive in priority order). All five stone
  // trinkets once shipped on a single floor — one behind a ward gate, one on a hidden path — so
  // missing that floor made the row unfinishable. Spread is the mitigation; this guards it.
  it("spreads each tier's collectibles over more than one level", () => {
    const perTier = Object.entries(SELLABLES_BY_TIER).map(([tier, items]) => {
      const levels = new Set(items.flatMap(item => [...(placed.get(item.id) ?? [])]))
      return { tier, levels: levels.size }
    })
    const stuck = perTier.filter(t => t.levels < 2)
    expect(stuck, `tier(s) with every collectible on one level: ${stuck.map(t => t.tier).join(", ")}`).toEqual([])
  })
})
