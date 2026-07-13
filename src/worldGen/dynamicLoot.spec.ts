import { describe, expect, it } from "vitest"
import { assignDynamicLoot, type ConsumableSpec, type DynamicLootSpecs } from "./dynamicLoot"
import { sellablesForDifficulty } from "../data/sellables"
import type { Difficulty } from "../data/difficultyLevels"
import type { Slot } from "./slots"
import type { TreasureReward } from "./types"

// Stand-ins for the mod-owned specs — trap consumables, shop money + junk — at production density.
const CONSUMABLES: ConsumableSpec = { fraction: 441 / 1714, roll: () => "bandage" }
const SPECS: DynamicLootSpecs = {
  consumables: CONSUMABLES,
  money: { fraction: 199 / 1714 },
  junk: { eagerness: { end: 1, puzzle: 0.6 }, itemsForTier: tier => sellablesForDifficulty(tier as Difficulty) },
}

const puzzleSlot = (siteId: string, seq: number, sink: (r: TreasureReward | undefined) => void): Slot => ({
  ref: { journeyId: siteId, levelIndex: 0, floorIndex: 0 },
  journeyId: siteId,
  tier: "starter",
  wardKeys: [],
  isPlaceholder: false,
  kind: "puzzle",
  siteId,
  puzzleSeq: seq,
  assign: sink,
})

const endSlot = (tier: Slot["tier"], sink: (r: TreasureReward | undefined) => void): Slot => ({
  ref: { journeyId: "j", levelIndex: 0, floorIndex: 0 },
  journeyId: "j",
  tier,
  wardKeys: [],
  isPlaceholder: true,
  kind: "end",
  assign: sink,
})

const runPuzzle = (siteId: string, n: number): (TreasureReward | undefined)[] => {
  const out: (TreasureReward | undefined)[] = new Array(n).fill(undefined)
  const set = new Set<Slot>(Array.from({ length: n }, (_, i) => puzzleSlot(siteId, i, r => (out[i] = r))))
  assignDynamicLoot(set, SPECS)
  return out
}

describe("assignDynamicLoot", () => {
  it("is deterministic per site and leaves some puzzle slots empty", () => {
    const a = runPuzzle("site-a", 40)
    const b = runPuzzle("site-a", 40)
    expect(a).toEqual(b)
    for (const r of a.filter(Boolean)) expect(["consumable", "money", "sellable"]).toContain(r!.type)
    expect(a.filter(r => r === undefined).length).toBeGreaterThan(0) // eagerness < 1 → not every slot
  })

  it("seeds puzzle placement per site — different sites get different patterns", () => {
    // Regression guard (moved from buildSite): placement is keyed by siteId (journeyId:level),
    // so two sites of the same shape must not get identical reward layouts.
    expect(runPuzzle("site-x", 30)).not.toEqual(runPuzzle("site-y", 30))
  })

  it("honors the consumable eligible filter — none on ineligible slots", () => {
    // All slots here are starter; an expert+ eligible rule places zero consumables (money still).
    const out: (TreasureReward | undefined)[] = new Array(40).fill(undefined)
    const set = new Set<Slot>(Array.from({ length: 40 }, (_, i) => puzzleSlot("site-e", i, r => (out[i] = r))))
    assignDynamicLoot(set, { ...SPECS, consumables: { ...CONSUMABLES, eligible: s => s.tier !== "starter" } })
    expect(out.some(r => r?.type === "consumable")).toBe(false)
    expect(out.some(r => r?.type === "money")).toBe(true)
  })

  it("places no consumables when no spec is injected (trap off)", () => {
    const out: (TreasureReward | undefined)[] = new Array(40).fill(undefined)
    const set = new Set<Slot>(Array.from({ length: 40 }, (_, i) => puzzleSlot("site-off", i, r => (out[i] = r))))
    assignDynamicLoot(set, { money: SPECS.money, junk: SPECS.junk }) // shop on, trap off
    expect(out.some(r => r?.type === "consumable")).toBe(false)
    expect(out.some(r => r?.type === "money")).toBe(true)
  })

  it("places no money or junk when shop is off (only trap consumables remain)", () => {
    const out: (TreasureReward | undefined)[] = new Array(40).fill(undefined)
    const set = new Set<Slot>(Array.from({ length: 40 }, (_, i) => puzzleSlot("site-noshop", i, r => (out[i] = r))))
    assignDynamicLoot(set, { consumables: CONSUMABLES }) // shop off — no money/junk spec
    expect(out.some(r => r?.type === "consumable")).toBe(true)
    expect(out.some(r => r?.type === "money")).toBe(false)
    expect(out.some(r => r?.type === "sellable")).toBe(false)
  })

  it("puts money/consumables AND junk in a puzzle-only pool (junk is eager on empties)", () => {
    const rewards = runPuzzle("site-b", 40).filter(Boolean)
    const types = new Set(rewards.map(r => r!.type))
    expect(types).toContain("consumable")
    expect(types).toContain("money")
    expect(types).toContain("sellable")
  })

  it("fills every chest, clears the pool", () => {
    const filled: (TreasureReward | undefined)[] = []
    const set = new Set<Slot>(Array.from({ length: 8 }, () => endSlot("starter", r => filled.push(r))))
    assignDynamicLoot(set, SPECS)
    expect(set.size).toBe(0)
    expect(filled.filter(r => r?.type === "sellable")).toHaveLength(8) // chests eager100
  })

  it("round-robins junk so every tier item appears (≥1-of-each completeness)", () => {
    const ids: string[] = []
    const set = new Set<Slot>(
      Array.from({ length: 5 }, () => endSlot("starter", r => ids.push((r as { itemId: string }).itemId)))
    )
    assignDynamicLoot(set, SPECS)
    expect(new Set(ids).size).toBe(5) // all 5 stone items, no repeats
  })

  it("hard-fails when a tier has fewer loot slots than collectibles", () => {
    const set = new Set<Slot>(Array.from({ length: 3 }, () => endSlot("starter", () => {})))
    expect(() => assignDynamicLoot(set, SPECS)).toThrow(/junk completeness/)
  })
})
