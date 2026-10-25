import { describe, expect, it } from "vitest"
import { CAMP_STEPS } from "@/mods/camp/game/campSteps"
import { arrivedTag } from "@/mods/camp/game/campState"
import { PURCHASES } from "@/mods/shop/game/purchases"
import { ANIMALS, arrivedTag as storyArrivedTag } from "@/mods/story/game/reaction/animalBeats"

// The shop and the camp share one vocabulary, the purchase fact, and neither imports the other: the camp's bought
// steps name the fact as a plain string. This is the one place that reads both, so a fact spelt differently on one
// side, or a purchase that would never show in the camp, is caught here. The story names the same facts, and the
// camp's arrival tag, as plain strings too.
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

  it("every purchase is an animal the story speaks of, and every animal is a purchase", () => {
    const storyFacts = new Set(ANIMALS.map(animal => animal.fact))
    expect([...shopFacts].filter(fact => !storyFacts.has(fact))).toEqual([])
    expect([...storyFacts].filter(fact => !shopFacts.has(fact))).toEqual([])
  })

  it("the story's beats for a gate cover exactly the purchases that open one", () => {
    const opensAGate = new Set(PURCHASES.filter(purchase => purchase.opens).map(purchase => purchase.fact))
    expect(ANIMALS.filter(({ fact, needed }) => needed !== opensAGate.has(fact)).map(({ id }) => id)).toEqual([])
  })

  it("the story reads the tag the camp gives an arrived purchase", () => {
    expect(ANIMALS.filter(({ fact }) => storyArrivedTag(fact) !== arrivedTag(fact))).toEqual([])
  })
})
