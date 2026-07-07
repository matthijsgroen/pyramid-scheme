import { describe, expect, it } from "vitest"
import { generateNewSeed, mulberry32, shuffle } from "./random"

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(a()).toBe(b())
  })

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })

  it("produces different values on successive calls", () => {
    const random = mulberry32(1)
    const first = random()
    const second = random()
    expect(first).not.toBe(second)
  })

  it("returns values in [0, 1)", () => {
    const random = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe("generateNewSeed", () => {
  it("is deterministic for a given seed and index", () => {
    expect(generateNewSeed(42, 5)).toBe(generateNewSeed(42, 5))
  })

  it("produces a different seed for a different index", () => {
    expect(generateNewSeed(42, 0)).not.toBe(generateNewSeed(42, 1))
  })

  it("produces a different seed for a different base seed", () => {
    expect(generateNewSeed(1, 3)).not.toBe(generateNewSeed(2, 3))
  })
})

describe("shuffle", () => {
  it("is deterministic for a given random function", () => {
    const array = [1, 2, 3, 4, 5]
    const a = shuffle(array, mulberry32(42))
    const b = shuffle(array, mulberry32(42))
    expect(a).toEqual(b)
  })

  it("does not mutate the input array", () => {
    const array = [1, 2, 3, 4, 5]
    shuffle(array, mulberry32(1))
    expect(array).toEqual([1, 2, 3, 4, 5])
  })

  it("keeps the same elements, only reordered", () => {
    const array = [1, 2, 3, 4, 5]
    const result = shuffle(array, mulberry32(1))
    expect(result).toHaveLength(array.length)
    expect(result.slice().sort()).toEqual(array.slice().sort())
  })

  it("defaults to Math.random when no random function is given", () => {
    const array = [1, 2, 3]
    const result = shuffle(array)
    expect(result.slice().sort()).toEqual(array.slice().sort())
  })
})
