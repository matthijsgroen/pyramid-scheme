import { describe, expect, it } from "vitest"
import type { ReachabilitySupport } from "@/worldGen/reachability"
import { MOD_LOOT_TOTALS, REGISTERED_MODS, mergeReachabilitySupports } from "./registeredMods"

describe("MOD_LOOT_TOTALS", () => {
  it("is every registered mod's rows in registry order, without throwing on an empty world", () => {
    const expected = REGISTERED_MODS.flatMap(m => m.lootTotals?.({}) ?? [])
    expect(expected.length).toBeGreaterThan(0)
    expect(MOD_LOOT_TOTALS({})).toEqual(expected)
  })
})

describe(mergeReachabilitySupports, () => {
  const first: ReachabilitySupport = {
    journeyEntryLocks: id => (id === "tomb" ? [{ bucket: "pieces", threshold: 3 }] : []),
    tierUnlockGroups: tier => (tier === "expert" ? [["perk-a", "perk-b"]] : []),
  }
  const second: ReachabilitySupport = {
    journeyEntryLocks: id => (id === "tomb" ? [{ bucket: "other-mod-key", threshold: 1 }] : []),
    tierUnlockGroups: tier => (tier === "expert" ? [["other-mod-key"]] : []),
  }

  it("concatenates every support's entry locks and tier groups in order, not first-wins", () => {
    const merged = mergeReachabilitySupports([first, second])
    expect(merged.journeyEntryLocks?.("tomb")).toEqual([
      { bucket: "pieces", threshold: 3 },
      { bucket: "other-mod-key", threshold: 1 },
    ])
    expect(merged.tierUnlockGroups?.("expert")).toEqual([["perk-a", "perk-b"], ["other-mod-key"]])
  })

  it("adds nothing for a support with no gates", () => {
    const merged = mergeReachabilitySupports([first, {}])
    expect(merged.journeyEntryLocks?.("tomb")).toEqual([{ bucket: "pieces", threshold: 3 }])
    expect(merged.tierUnlockGroups?.("expert")).toEqual([["perk-a", "perk-b"]])
    expect(merged.tierUnlockGroups?.("starter")).toEqual([])
  })
})
