import { describe, expect, it } from "vitest"
import { perkLevel, perkStacks } from "./perkTotals"

describe("perkLevel (tiered perks)", () => {
  it("is 0 when nothing carries the perk", () => {
    expect(perkLevel([{ type: "compass", level: 2 }], "detection", 4)).toBe(0)
  })

  it("takes the best level held, so a lower tier never demotes you", () => {
    const perks = [
      { type: "detection", level: 1 },
      { type: "detection", level: 3 },
      { type: "detection", level: 2 },
    ]
    expect(perkLevel(perks, "detection", 4)).toBe(3)
  })

  it("treats a level-less perk of a tiered type as level 1", () => {
    expect(perkLevel([{ type: "detection" }], "detection", 4)).toBe(1)
  })

  it("never exceeds the cap", () => {
    expect(perkLevel([{ type: "detection", level: 9 }], "detection", 4)).toBe(4)
  })
})

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
