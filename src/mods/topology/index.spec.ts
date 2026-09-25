import { describe, it, expect } from "vitest"
import { topologyMod } from "./index"
import { REGISTERED_MODS, isModEnabled } from "@/mods/registeredMods"
import { ALL_FAMILY_META } from "@/mods/allFamilyMeta"

describe("the topology mod", () => {
  it("is registered", () => {
    expect(isModEnabled("topology")).toBe(true)
    expect(REGISTERED_MODS).toContain(topologyMod)
  })

  it("contributes its families, each owned by itself", () => {
    expect(topologyMod.families?.map(f => f.id)).toEqual(["lightbeam", "lightbeamSwitch", "witnessDoor"])
    expect(topologyMod.families?.map(f => f.ownerMod)).toEqual(["topology", "topology", "topology"])
  })

  it("keeps the witness door out of the generic loot pool", () => {
    expect(topologyMod.families?.find(f => f.id === "witnessDoor")?.rewardPriority).toBe(0)
  })

  // A switch is a fork the player walks back into to change their mind; without this the branch they
  // did not take is shut for good, and assembleFloor refuses the floor rather than build that.
  it("keeps the lightbeam switch re-enterable, and out of the generic loot pool", () => {
    const meta = topologyMod.families?.find(f => f.id === "lightbeamSwitch")
    expect(meta?.reEnterable).toBe(true)
    expect(meta?.rewardPriority).toBe(0)
  })

  it('places the lightbeam switch only by id, never in the generic "puzzle" pool', () => {
    // Its answer is which way out opens, so a room drawn from the generic pool would put the board
    // somewhere with no fork under it and the player would decide nothing by solving it.
    const puzzlePool = ALL_FAMILY_META.filter(m => m.tags.includes("puzzle")).map(m => m.id)
    expect(puzzlePool).not.toContain("lightbeamSwitch")
    expect(ALL_FAMILY_META.map(m => m.id)).toContain("lightbeamSwitch")
  })

  it('places the witness door only by id, while lightbeam serves the generic "puzzle" pool', () => {
    // Same seam rolePools.spec.ts's poolForTag uses: the pool a role draws from is every registered
    // family whose tags include it (src/mods/allFamilyMeta.ts's familyBag). A room authored to the
    // "puzzle" role must never be able to draw witnessDoor — it would let a player open a shrine that
    // gates nothing they were routed to, minting a key nothing consumes. Lightbeam is an ordinary
    // corridor puzzle and belongs in that pool, which is why the guard is per family and not per mod.
    const puzzlePool = ALL_FAMILY_META.filter(m => m.tags.includes("puzzle")).map(m => m.id)
    expect(puzzlePool).not.toContain("witnessDoor")
    expect(puzzlePool).toContain("lightbeam")
  })
})
