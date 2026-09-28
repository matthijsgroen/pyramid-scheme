import { describe, expect, it } from "vitest"
import { appetiteAccepts } from "./regions"

describe("what a region will take", () => {
  it("takes the kind it names, and anything when it is free", () => {
    expect(appetiteAccepts("reward", "reward")).toBe(true)
    expect(appetiteAccepts("puzzles", "puzzle")).toBe(true)
    expect(appetiteAccepts("free", "reward")).toBe(true)
    expect(appetiteAccepts("free", "puzzle")).toBe(true)
  })

  // `nothing` is a promise the region stays empty; `free` is indifference. Collapsing the two would
  // lose an instruction the builder is given.
  it("takes nothing at all where the region is promised empty", () => {
    expect(appetiteAccepts("nothing", "reward")).toBe(false)
    expect(appetiteAccepts("nothing", "puzzle")).toBe(false)
  })

  it("does not take a kind another appetite names", () => {
    expect(appetiteAccepts("reward", "puzzle")).toBe(false)
    expect(appetiteAccepts("puzzles", "reward")).toBe(false)
  })
})
