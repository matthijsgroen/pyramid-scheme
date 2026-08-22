import { describe, expect, it } from "vitest"
import { seedable, type FamilyOptions } from "@/game/families/familyMeta"
import { findSeeds } from "./findSeeds"

// Admits even seeds, throws on multiples of 7 — so the spec can tell "the attempt missed" from "the
// board came back and was rejected", which are the two ways a family declines a seed.
const family = seedable({
  resolveOptions: () => ({}),
  generate: (seed: number) => {
    if (seed % 7 === 0) throw new Error("no board")
    return seed
  },
  grade: (board: number) => (board % 2 === 0 ? { steps: board } : null),
})
const options = {} as FamilyOptions

describe("findSeeds", () => {
  it("keeps only seeds whose board the family would ship", () => {
    expect(findSeeds(family, options, 1, 10).map(found => found.seed)).toEqual([2, 4, 6, 8, 10])
  })

  it("passes over a seed whose one attempt threw", () => {
    expect(findSeeds(family, options, 12, 3).map(found => found.seed)).toEqual([12])
  })

  it("carries the grade back, so the pass can report what a tier demands", () => {
    expect(findSeeds(family, options, 4, 1)).toEqual([{ seed: 4, grade: { steps: 4 } }])
  })

  it("gives the same seeds whether the space is scanned whole or in windows", () => {
    const whole = findSeeds(family, options, 1, 60)
    const windowed = [0, 20, 40].flatMap(offset => findSeeds(family, options, 1 + offset, 20))
    expect(windowed).toEqual(whole)
  })
})
