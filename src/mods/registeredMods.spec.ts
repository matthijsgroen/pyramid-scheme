import { describe, expect, it } from "vitest"
import { MOD_LOOT_TOTALS, REGISTERED_MODS } from "./registeredMods"

describe("MOD_LOOT_TOTALS", () => {
  it("is every registered mod's rows in registry order, without throwing on an empty world", () => {
    const expected = REGISTERED_MODS.flatMap(m => m.lootTotals?.({}) ?? [])
    expect(expected.length).toBeGreaterThan(0)
    expect(MOD_LOOT_TOTALS({})).toEqual(expected)
  })
})
