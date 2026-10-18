import { describe, expect, it } from "vitest"
import { pullActivator, webHeldKeys } from "./webKeys"
import type { WebPulled } from "./webKeys"

const ACTIVATORS = [
  { name: "sun", pots: ["w3"] },
  { name: "moon", pots: ["w3", "w1p3"] },
  { name: "star", pots: ["w3"] },
  { name: "ankh", pots: [] },
]

const pulledOf = (...names: string[]): WebPulled => names.reduce(pullActivator, {} as WebPulled)

describe("the keys held from the web", () => {
  it("gives web:<pot>#2 for any two of the pot's levers pulled, and no #3", () => {
    for (const two of [
      ["sun", "moon"],
      ["moon", "star"],
      ["star", "sun"],
    ]) {
      const held = webHeldKeys(pulledOf(...two), ACTIVATORS)
      expect(held.has("web:w3#1")).toBe(true)
      expect(held.has("web:w3#2")).toBe(true)
      expect(held.has("web:w3#3")).toBe(false)
    }
  })

  it("gives web:<name> for an activator taken, counting it in every pot it lists", () => {
    expect([...webHeldKeys(pulledOf("moon", "ankh"), ACTIVATORS)].sort()).toEqual([
      "web:ankh",
      "web:moon",
      "web:w1p3#1",
      "web:w3#1",
    ])
  })

  it("only ever grows the pulled set, and counts a lever pulled twice once", () => {
    const once = pulledOf("sun")
    const twice = pullActivator(once, "sun")
    expect(twice).toBe(once)
    expect(webHeldKeys(twice, ACTIVATORS)).toEqual(webHeldKeys(once, ACTIVATORS))
    expect(webHeldKeys(twice, ACTIVATORS).has("web:w3#2")).toBe(false)
    const more = pullActivator(once, "star")
    expect(Object.keys(more).sort()).toEqual(["star", "sun"])
    for (const key of webHeldKeys(once, ACTIVATORS)) expect(webHeldKeys(more, ACTIVATORS).has(key)).toBe(true)
  })
})
