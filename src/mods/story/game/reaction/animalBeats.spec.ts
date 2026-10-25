import { describe, expect, it } from "vitest"
import type { Reaction } from "@/app/reactions/reactionContributions"
import { DRAFT_BEATS } from "../drafts"
import { ANIMALS, animalBeatsFor, arrivedTag, boughtBeats } from "./animalBeats"

const declared = new Set(DRAFT_BEATS.animals)
const fact = (id: string) => ANIMALS.find(animal => animal.id === id)!.fact
const entered = (journeyId: string): Reaction => ({ kind: "siteArrived", journeyId, levelNr: 1 })

describe("the animals", () => {
  it("each have the bought and arrives beat drafted, and a through and blocked beat when a gate asks for them", () => {
    const missing = ANIMALS.flatMap(({ id, needed }) =>
      [
        `animal.bought${id}`,
        `animal.arrives${id}`,
        ...(needed ? [`animal.through${id}`, `animal.blocked${id}`] : []),
      ].filter(beat => !declared.has(beat))
    )
    expect(missing).toEqual([])
  })

  it("name no animal twice", () => {
    expect(new Set(ANIMALS.map(animal => animal.fact)).size).toBe(ANIMALS.length)
  })
})

describe("boughtBeats", () => {
  it("offers the beat of a fact that joined the held keys, and of none already held", () => {
    const before = new Set([fact("Cart")])
    const now = new Set([fact("Cart"), fact("Donkey"), "made-up-fact"])
    expect(boughtBeats(before, now)).toEqual(["animal.boughtDonkey"])
  })

  it("offers nothing when nothing joined", () => {
    expect(boughtBeats(new Set([fact("Cart")]), new Set([fact("Cart")]))).toEqual([])
  })
})

describe("animalBeatsFor", () => {
  const needing = (gate: object, key: string) => (probe: object) =>
    JSON.stringify(probe) === JSON.stringify(gate) ? [{ key }] : []

  it("plays through<Id> on entering a journey whose own gate needs a held fact", () => {
    const world = { held: new Set([fact("Donkey")]), needsOn: needing({ journeyId: "made-up-tomb" }, fact("Donkey")) }
    expect(animalBeatsFor(entered("made-up-tomb"), world, declared)).toEqual(["animal.throughDonkey"])
  })

  it("plays through<Id> on entering a journey whose tier needs a held fact", () => {
    const world = {
      held: new Set([fact("Cart")]),
      needsOn: needing({ tier: "master" }, fact("Cart")),
      tierOf: () => "master" as const,
    }
    expect(animalBeatsFor(entered("made-up-journey"), world, declared)).toEqual(["animal.throughCart"])
  })

  it("stays quiet when the fact is not held, or the gate asks for something else", () => {
    const needsDonkey = needing({ journeyId: "made-up-tomb" }, fact("Donkey"))
    expect(animalBeatsFor(entered("made-up-tomb"), { held: new Set(), needsOn: needsDonkey }, declared)).toEqual([])
    expect(
      animalBeatsFor(entered("made-up-tomb"), { held: new Set([fact("Camel")]), needsOn: needsDonkey }, declared)
    ).toEqual([])
    expect(
      animalBeatsFor(entered("elsewhere"), { held: new Set([fact("Donkey")]), needsOn: needsDonkey }, declared)
    ).toEqual([])
  })

  it("plays blocked<Id> when a gate shows an unmet fact of an animal, and not one already held", () => {
    const shown = (unmet: string[]): Reaction => ({ kind: "gateShown", gate: { tier: "expert" }, unmet })
    const world = { held: new Set<string>(), needsOn: () => [] }
    expect(animalBeatsFor(shown([fact("Donkey"), "made-up-fact"]), world, declared)).toEqual(["animal.blockedDonkey"])
    expect(animalBeatsFor(shown(["made-up-fact"]), world, declared)).toEqual([])
    expect(animalBeatsFor(shown([fact("Cart")]), { ...world, held: new Set([fact("Cart")]) }, declared)).toEqual([])
  })

  it("plays forSale when the stall shows a purchase, and not for other stock", () => {
    const world = { held: new Set<string>(), needsOn: () => [] }
    const stall = (...types: string[]): Reaction => ({
      kind: "stockShown",
      journeyId: "made-up-tomb",
      rewards: types.map(type => ({ type })),
    })
    expect(animalBeatsFor(stall("sellable", "purchase"), world, declared)).toEqual(["animal.forSale"])
    expect(animalBeatsFor(stall("sellable", "fragment"), world, declared)).toEqual([])
    expect(animalBeatsFor(stall(), world, declared)).toEqual([])
  })

  it("plays arrives<Id> when coming home to a camp that carries the arrived tag", () => {
    const world = { held: new Set<string>(), needsOn: () => [] }
    const home = (tags: string[], arrived?: { haul: boolean }): Reaction => ({ kind: "homeShown", tags, arrived })
    expect(animalBeatsFor(home([arrivedTag(fact("Camel"))], { haul: false }), world, declared)).toEqual([
      "animal.arrivesCamel",
    ])
    expect(animalBeatsFor(home([arrivedTag(fact("Camel"))]), world, declared)).toEqual([])
    expect(animalBeatsFor(home([], { haul: true }), world, declared)).toEqual([])
  })

  it("plays arrives<Id> from the tag alone, not from the fact being held", () => {
    const world = { held: new Set([fact("Camel")]), needsOn: () => [] }
    expect(animalBeatsFor({ kind: "homeShown", tags: [], arrived: { haul: false } }, world, declared)).toEqual([])
  })

  it("never returns a beat that is not declared", () => {
    const world = { held: new Set([fact("Donkey")]), needsOn: () => [{ key: fact("Donkey") }] }
    expect(animalBeatsFor(entered("made-up-tomb"), world, new Set())).toEqual([])
  })

  it("has nothing for the banner's gate, which opens nothing", () => {
    const world = { held: new Set([fact("CaravanBanner")]), needsOn: () => [{ key: fact("CaravanBanner") }] }
    expect(animalBeatsFor(entered("made-up-tomb"), world, declared)).toEqual([])
  })

  it("is silent on moments that are not an entering or a homecoming", () => {
    const world = { held: new Set([fact("Donkey")]), needsOn: () => [{ key: fact("Donkey") }] }
    expect(animalBeatsFor({ kind: "chapterOpened", tier: "expert" }, world, declared)).toEqual([])
  })
})
