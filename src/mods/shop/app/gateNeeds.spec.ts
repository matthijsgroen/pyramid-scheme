import { describe, expect, it } from "vitest"
import type { PurchaseTable } from "@/mods/shop/game/purchases"
import { purchaseGateNeeds } from "./gateNeeds"

const table: PurchaseTable = [
  { id: "mule", fact: "purchase:mule", price: 10, soldAt: { journeyId: "tomb_a" }, opens: { tier: "expert" } },
  { id: "ox", fact: "purchase:ox", price: 10, soldAt: { journeyId: "tomb_a" }, opens: { journeyId: "tomb_c" } },
  { id: "flag", fact: "purchase:flag", price: 20, soldAt: { journeyId: "tomb_b" } },
]

// A test `t` that shows the key, and the place it was given.
const t = (key: string, opts?: Record<string, unknown>) =>
  opts?.ns ? `${opts.ns}:${key}` : opts?.place ? `${key}(${opts.place})` : key

const needs = purchaseGateNeeds(table, t)

describe("purchaseGateNeeds", () => {
  it("asks for the purchase that opens a tier, with where Fez sells it", () => {
    expect(needs({ tier: "expert" })).toEqual([
      { key: "purchase:mule", label: "purchases.mule.need", hint: "purchases.hint(journeys:tomb_a.name)" },
    ])
  })

  it("asks for the purchase that opens a journey", () => {
    expect(needs({ journeyId: "tomb_c" })).toEqual([
      { key: "purchase:ox", label: "purchases.ox.need", hint: "purchases.hint(journeys:tomb_a.name)" },
    ])
  })

  it("asks nothing of a gate no purchase opens", () => {
    expect(needs({ tier: "master" })).toEqual([])
    expect(needs({ journeyId: "tomb_b" })).toEqual([])
  })

  it("adds no need for a purchase that opens nothing", () => {
    const all = [{ tier: "expert" as const }, { journeyId: "tomb_c" }, { journeyId: "tomb_b" }].flatMap(needs)
    expect(all.map(need => need.key)).not.toContain("purchase:flag")
  })
})
