import { describe, it, expect } from "vitest"
import { registerPerk, getPerkMeta, allPerks } from "./perkRegistry"

describe("perkRegistry", () => {
  it("registers a perk and retrieves it by id", () => {
    const bump = (current: number) => current + 1
    registerPerk({ id: "testPerk", ownerMod: "test", slice: "corePerks", field: "testLevel", maxLevel: 3, bump })
    const meta = getPerkMeta("testPerk")
    expect(meta?.ownerMod).toBe("test")
    expect(meta?.slice).toBe("corePerks")
    expect(meta?.field).toBe("testLevel")
    expect(meta?.bump).toBe(bump)
  })

  it("returns undefined for an unregistered id", () => {
    expect(getPerkMeta("neverRegistered")).toBeUndefined()
  })

  it("allPerks lists every registered perk", () => {
    registerPerk({
      id: "testPerk2",
      ownerMod: "test",
      slice: "puzzlePerks",
      field: "otherLevel",
      maxLevel: 1,
      bump: () => 1,
    })
    expect(allPerks().some(p => p.id === "testPerk2")).toBe(true)
  })

  it("registering the same id again overwrites the previous entry", () => {
    registerPerk({ id: "testPerk", ownerMod: "test", slice: "corePerks", field: "a", maxLevel: 1, bump: () => 1 })
    registerPerk({ id: "testPerk", ownerMod: "test2", slice: "trapPerks", field: "b", maxLevel: 1, bump: () => 1 })
    expect(getPerkMeta("testPerk")?.ownerMod).toBe("test2")
  })
})
