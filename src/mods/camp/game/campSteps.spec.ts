import { describe, expect, it } from "vitest"
import { difficulties, isFreeOrderDifficulty } from "@/data/difficultyLevels"
import {
  campDemand,
  campStepProblems,
  campUnits,
  PART_BANDS,
  type CampStepEntry,
  type CampStepTable,
} from "./campSteps"

const step = (over: Partial<CampStepEntry> & Pick<CampStepEntry, "id">): CampStepEntry => ({
  spot: "hearth",
  tier: "starter",
  source: "found",
  ...over,
})

const sound: CampStepTable = [
  step({ id: "pot" }),
  step({ id: "ring", source: "structure", parts: ["stones", "sand"] }),
  step({ id: "hut", tier: "master", source: "structure", parts: ["a", "b", "c", "d"] }),
  step({ id: "seed", tier: "junior" }),
  step({ id: "sprout", tier: "junior", source: "grows", growsFrom: ["seed"] }),
  step({ id: "cart", tier: "junior", source: "bought", purchase: "purchase:wagon", arrival: "wagon" }),
  step({ id: "map", source: "fixed" }),
  step({ id: "bed", source: "given" }),
]

describe("campStepProblems", () => {
  it("is empty for a sound table", () => {
    expect(campStepProblems(sound)).toEqual([])
  })

  it("names a step id used twice", () => {
    expect(campStepProblems([...sound, step({ id: "pot" })])).toEqual(['step "pot" appears more than once'])
  })

  it("names a structure without parts", () => {
    expect(campStepProblems([step({ id: "ring", source: "structure" })])).toEqual(['structure "ring" has no parts'])
  })

  it("names a tier with two early structures", () => {
    const early = (id: string) => step({ id, tier: "junior", source: "structure", parts: ["a", "b"], early: true })
    expect(campStepProblems([early("wall"), early("screen")])).toEqual([
      'junior has 2 early structures ("wall", "screen"), at most one',
    ])
  })

  it("names a purchase with no arrival step, or two", () => {
    const wagon = (id: string, arrival?: string) =>
      step({ id, source: "bought", purchase: "purchase:wagon", ...(arrival && { arrival }) })
    expect(campStepProblems([wagon("cart")])).toEqual([
      'purchase "purchase:wagon" has 0 arrival steps, exactly one is needed',
    ])
    expect(campStepProblems([wagon("cart", "wagon"), wagon("wheel", "wheel")])).toEqual([
      'purchase "purchase:wagon" has 2 arrival steps, exactly one is needed',
    ])
  })

  it("names an arrival on a step that is not bought", () => {
    expect(campStepProblems([step({ id: "pot", arrival: "pot" })])).toEqual([
      'step "pot" is found but names arrival "pot"',
    ])
  })

  it("names a part used twice in a structure", () => {
    expect(campStepProblems([step({ id: "ring", source: "structure", parts: ["a", "a"] })])).toEqual([
      'structure "ring" has part "a" twice',
    ])
  })

  it("names a part count outside its tier's band", () => {
    expect(campStepProblems([step({ id: "hut", tier: "master", source: "structure", parts: ["a", "b"] })])).toEqual([
      'structure "hut" has 2 parts, master allows 4 to 6',
    ])
    expect(
      campStepProblems([step({ id: "ring", source: "structure", parts: ["a", "b", "c", "d", "e"] })])
    ).toHaveLength(1)
  })

  it("names an early step that is not a structure", () => {
    expect(campStepProblems([step({ id: "pot", early: true })])).toEqual(['step "pot" is early but not a structure'])
  })

  it("names an early structure with fewer than 2 parts", () => {
    expect(campStepProblems([step({ id: "ring", source: "structure", parts: ["a"], early: true })])).toContain(
      'early structure "ring" needs at least 2 parts, one for each of the first two journeys'
    )
  })

  it("names an early step on a tier whose journeys open in no order", () => {
    const freeOrder = difficulties.find(isFreeOrderDifficulty)!
    const parts = ["a", "b", "c", "d", "e"].slice(0, PART_BANDS[freeOrder].min)
    expect(campStepProblems([step({ id: "ring", tier: freeOrder, source: "structure", parts, early: true })])).toEqual([
      `step "ring" is early in ${freeOrder}, whose journeys open in no order`,
    ])
  })

  it("names a tier with two early structures, and allows one per tier", () => {
    const early = (id: string, tier: CampStepEntry["tier"]) =>
      step({
        id,
        tier,
        source: "structure",
        parts: ["a", "b", "c", "d"].slice(0, tier === "master" ? 4 : 2),
        early: true,
      })
    expect(campStepProblems([early("ring", "starter"), early("hut", "master")])).toEqual([])
    expect(campStepProblems([early("ring", "starter"), early("wall", "starter")])).toEqual([
      'starter has 2 early structures ("ring", "wall"), at most one',
    ])
  })

  it("names parts on a step that is not a structure", () => {
    expect(campStepProblems([step({ id: "pot", parts: ["lid"] })])).toEqual([
      'step "pot" is not a structure but has parts',
    ])
  })

  it("names a growing step without a source step or with an unknown one", () => {
    expect(campStepProblems([step({ id: "sprout", source: "grows" })])).toEqual([
      'growing step "sprout" names no step it grows from',
    ])
    expect(campStepProblems([step({ id: "sprout", source: "grows", growsFrom: ["seed"] })])).toEqual([
      'growing step "sprout" grows from unknown step "seed"',
    ])
  })

  it("names a bought step that names no purchase", () => {
    expect(campStepProblems([step({ id: "cart", source: "bought" })])).toEqual(['bought step "cart" names no purchase'])
  })

  it("names a purchase on a step that is not bought", () => {
    expect(campStepProblems([step({ id: "pot", purchase: "purchase:wagon" })])).toEqual([
      'step "pot" is found but names purchase "purchase:wagon"',
      'purchase "purchase:wagon" has 0 arrival steps, exactly one is needed',
    ])
  })

  it("names a growing step that grows from a given or bought step, which never stands by being found", () => {
    expect(
      campStepProblems([
        step({ id: "bed", source: "given" }),
        step({ id: "cart", source: "bought", purchase: "purchase:wagon", arrival: "wagon" }),
        step({ id: "sprout", source: "grows", growsFrom: ["bed", "cart"] }),
      ])
    ).toEqual([
      'growing step "sprout" grows from "bed", which is given',
      'growing step "sprout" grows from "cart", which is bought',
    ])
  })
})

describe("campDemand", () => {
  it("sums finds and parts per tier and leaves a tier with none at zero", () => {
    expect(campDemand(sound)).toEqual({
      starter: { finds: 1, parts: 2 },
      junior: { finds: 1, parts: 0 },
      expert: { finds: 0, parts: 0 },
      master: { finds: 0, parts: 4 },
      wizard: { finds: 0, parts: 0 },
    })
  })
})

describe("campUnits", () => {
  it("lists every find and every part with its step's tier, in table order", () => {
    expect(
      campUnits(sound).map(u => [u.kind, u.kind === "find" ? u.step.id : `${u.structure.id}.${u.part}`, u.tier])
    ).toEqual([
      ["find", "pot", "starter"],
      ["part", "ring.stones", "starter"],
      ["part", "ring.sand", "starter"],
      ["part", "hut.a", "master"],
      ["part", "hut.b", "master"],
      ["part", "hut.c", "master"],
      ["part", "hut.d", "master"],
      ["find", "seed", "junior"],
    ])
  })

  it("makes no unit for bought, grows, fixed and given steps", () => {
    const others = sound.filter(s => ["grows", "bought", "fixed", "given"].includes(s.source))
    expect(campUnits(others)).toEqual([])
  })
})
