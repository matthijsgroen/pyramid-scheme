import { describe, it, expect } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { SiteConfig, TreasureReward } from "./types"

// Invariant guard for the loot economy — asserts the MODEL over the whole shipped world, not any
// count. The model (docs/mods/ARCHITECTURE.md "Placement pipeline"): every loot-eligible slot is
// offered in reward-priority order, CHESTS FIRST, then puzzles; each provider fills its own count;
// whatever's left at the bottom is empty. Consequence — the one property worth guarding:
//
//   A treasure chest is empty ONLY if the world ran out of loot — and then puzzle slots (lower
//   priority) are empty too. So an empty chest WHILE any puzzle still bears loot means priority
//   order broke or a provider misbehaved. Given the authored loot, no chest should be empty at all.
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
    for (const r of rewards ?? []) if (r) filledPuzzleSlots++
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

describe("loot economy invariants (over the generated world)", () => {
  const { emptyChests, filledPuzzleSlots } = auditWorld(generatedWorldConfigs)

  it("fills chests before puzzles: no empty chest while any puzzle bears loot", () => {
    // If puzzle slots are filled, the priority order guarantees every (higher-priority) chest is
    // filled too. An empty chest here means the model broke — not a genuine loot shortage.
    if (filledPuzzleSlots > 0) {
      expect(
        emptyChests,
        `${emptyChests.length} empty chest(s) while ${filledPuzzleSlots} puzzle slots bear loot — ` +
          `priority order (chests first) was violated. First few: ${emptyChests.slice(0, 8).join("; ")}`
      ).toEqual([])
    }
  })
})
