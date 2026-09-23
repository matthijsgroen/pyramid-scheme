import { describe, it, expect } from "vitest"
import { witnessDoorMod } from "./index"
import { REGISTERED_MODS, isModEnabled } from "@/mods/registeredMods"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"

describe("the witnessDoor mod", () => {
  it("is registered", () => {
    expect(isModEnabled("witnessDoor")).toBe(true)
    expect(REGISTERED_MODS).toContain(witnessDoorMod)
  })

  it("contributes one family, owned by itself", () => {
    expect(witnessDoorMod.families?.map(f => f.id)).toEqual(["witnessDoor"])
    expect(witnessDoorMod.families?.[0].ownerMod).toBe("witnessDoor")
  })

  it("is never a candidate for the generic loot pool", () => {
    expect(witnessDoorMod.families?.[0].rewardPriority).toBe(0)
  })

  it('is not a member of the generic "puzzle" pool the allocator draws from', () => {
    // Same seam rolePools.spec.ts's poolForTag uses: the pool a role draws from is every
    // registered family whose tags include it (src/mods/allFamilyMeta.ts's familyBag). A room
    // authored to the "puzzle" role must never be able to draw witnessDoor — it is placed only
    // where a pyramid names it by id.
    const puzzlePool = ALL_FAMILY_META.filter(m => m.tags.includes("puzzle")).map(m => m.id)
    expect(puzzlePool).not.toContain("witnessDoor")
  })
})
