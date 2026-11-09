import { describe, expect, it } from "vitest"
import { perkStacks } from "./perkTotals"

describe("perkStacks (stacking perks)", () => {
  it("counts one stack per perk carrying the type", () => {
    const perks = [{ type: "max-health" }, { type: "armor" }, { type: "max-health" }]
    expect(perkStacks(perks, "max-health", 6)).toBe(2)
  })

  it("is 0 when nothing carries the perk", () => {
    expect(perkStacks([{ type: "armor" }], "trap-insight", 2)).toBe(0)
  })

  it("never exceeds the cap", () => {
    expect(
      perkStacks(
        Array.from({ length: 9 }, () => ({ type: "armor" })),
        "armor",
        2
      )
    ).toBe(2)
  })

  // The whole point of folding a SET of held treasures: the old "+1 per grant" write inflated
  // permanently if a claim was ever dispatched twice. Re-reading the same list cannot.
  it("is idempotent — folding the same perks again yields the same stacks", () => {
    const perks = [{ type: "armor" }]
    expect(perkStacks(perks, "armor", 2)).toBe(perkStacks(perks, "armor", 2))
  })
})

describe("detector level = parts held", () => {
  it("reads a single detection part as level 1, whichever treasure it came from", () => {
    expect(perkStacks([{ type: "detection" }], "detection", 4)).toBe(1)
  })

  it("reads any two compass parts as level 2", () => {
    expect(perkStacks([{ type: "compass" }, { type: "max-health" }, { type: "compass" }], "compass", 3)).toBe(2)
  })
})
