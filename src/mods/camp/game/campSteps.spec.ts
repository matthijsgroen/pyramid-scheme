import { describe, expect, it } from "vitest"
import { campDemand, campStepProblems, campUnits, type CampStepEntry, type CampStepTable } from "./campSteps"

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
  step({ id: "cart", tier: "junior", source: "bought" }),
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
