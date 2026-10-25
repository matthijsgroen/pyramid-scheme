import { describe, expect, it } from "vitest"
import { CAMP_STEPS } from "@/mods/camp/game/campSteps"
import { PURCHASES } from "@/mods/shop/game/purchases"

// The shop and the camp share one vocabulary, the purchase fact, and neither imports the other: the camp's bought
// steps name the fact as a plain string. This is the one place that reads both, so a fact spelt differently on one
// side, or a purchase that would never show in the camp, is caught here.
const campFacts = CAMP_STEPS.flatMap(step =>
  step.purchase === undefined ? [] : [{ step: step.id, fact: step.purchase }]
)
const shopFacts = new Set(PURCHASES.map(purchase => purchase.fact))

describe("the shop and the camp agree on purchase facts", () => {
  it("every fact a camp step waits for is a purchase in the shop's table", () => {
    const unknown = campFacts.filter(({ fact }) => !shopFacts.has(fact)).map(({ step, fact }) => `${step}: ${fact}`)
    expect(unknown).toEqual([])
  })

  it("every purchase in the shop brings at least one camp step", () => {
    const named = new Set(campFacts.map(({ fact }) => fact))
    expect(PURCHASES.filter(purchase => !named.has(purchase.fact)).map(purchase => purchase.id)).toEqual([])
  })
})
