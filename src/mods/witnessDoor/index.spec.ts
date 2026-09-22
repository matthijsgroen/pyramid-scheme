import { describe, it, expect } from "vitest"
import { witnessDoorMod } from "./index"
import { REGISTERED_MODS, isModEnabled } from "@/mods/registeredMods"

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
})
