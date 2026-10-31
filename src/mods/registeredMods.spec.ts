import { describe, expect, it } from "vitest"
import type { ReachabilitySupport } from "@/worldGen/reachability"
import { makeGateWalk } from "@/worldGen/gateWalk"
import {
  MOD_LOOT_TOTALS,
  REGISTERED_MODS,
  mergeReachabilitySupports,
  refuseModAuthoringProblems,
} from "./registeredMods"
import type { ModDescriptor } from "./modDescriptor"

describe("MOD_LOOT_TOTALS", () => {
  it("is every registered mod's rows in registry order, without throwing on an empty world", () => {
    const walk = makeGateWalk({ configs: {}, journeyMeta: {}, support: {} })
    const expected = REGISTERED_MODS.flatMap(m => m.lootTotals?.({}, walk) ?? [])
    expect(expected.length).toBeGreaterThan(0)
    expect(MOD_LOOT_TOTALS({}, walk)).toEqual(expected)
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

  it("two supports naming a hidden requirement fail the merge", () => {
    const naming: ReachabilitySupport = { hiddenRequirement: () => "made-up-sight" }
    expect(() => mergeReachabilitySupports([naming, { hiddenRequirement: () => "other-sight" }])).toThrow(
      /hidden requirement/
    )
  })

  it("keeps the one support's hidden requirement, and names none when no support does", () => {
    expect(mergeReachabilitySupports([first, { hiddenRequirement: () => "made-up-sight" }]).hiddenRequirement?.()).toBe(
      "made-up-sight"
    )
    expect(mergeReachabilitySupports([first, second]).hiddenRequirement).toBeUndefined()
  })

  it("drops an empty group, which would otherwise lock its tier for good", () => {
    const merged = mergeReachabilitySupports([first, { tierUnlockGroups: () => [[]] }])
    expect(merged.tierUnlockGroups?.("expert")).toEqual([["perk-a", "perk-b"]])
    expect(merged.tierUnlockGroups?.("junior")).toEqual([])
  })
})

describe(refuseModAuthoringProblems, () => {
  it("refuses with every problem of every mod, each named with its mod", () => {
    const mods: ModDescriptor[] = [
      { id: "made-up-a", authoringProblems: () => ["row 1 is wrong", "row 2 is wrong"] },
      { id: "made-up-b" },
      { id: "made-up-c", authoringProblems: () => ["row 3 is wrong"] },
    ]
    expect(() => refuseModAuthoringProblems(mods)).toThrow(
      "mod authoring refused: made-up-a: row 1 is wrong; made-up-a: row 2 is wrong; made-up-c: row 3 is wrong"
    )
  })

  it("lets a build through when no mod reports a problem", () => {
    expect(() =>
      refuseModAuthoringProblems([{ id: "made-up-a", authoringProblems: () => [] }, { id: "made-up-b" }])
    ).not.toThrow()
  })
})
