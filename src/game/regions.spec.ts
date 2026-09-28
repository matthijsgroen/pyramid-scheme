import { describe, expect, it } from "vitest"
import { appetiteAccepts, mainPathRegions, type RegionGraph } from "./regions"

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

const graph = (
  connections: Array<[string, string]>,
  names: string[],
  ports: { in: string; out: string }
): RegionGraph => ({
  regions: names.map(name => ({ name, appetite: "free" as const })),
  connections,
  ...ports,
})

describe("the regions the way out cannot be reached without", () => {
  it("names every region on a single corridor of them", () => {
    const g = graph(
      [
        ["in", "middle"],
        ["middle", "out"],
      ],
      ["in", "middle", "out"],
      { in: "in", out: "out" }
    )

    expect(mainPathRegions(g)).toEqual(new Set(["in", "middle", "out"]))
  })

  // The useful meaning of "main path" under cycles: a side path is one you can skip. Neither branch
  // of a fork that rejoins is needed, because the other one answers.
  it("names neither branch of a fork that rejoins, because either one will do", () => {
    const g = graph(
      [
        ["in", "left"],
        ["in", "right"],
        ["left", "out"],
        ["right", "out"],
      ],
      ["in", "left", "right", "out"],
      { in: "in", out: "out" }
    )

    expect(mainPathRegions(g)).toEqual(new Set(["in", "out"]))
  })

  it("does not name a pocket hanging off the route, which is skippable by definition", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "pocket"],
      ],
      ["in", "pocket", "out"],
      { in: "in", out: "out" }
    )

    expect(mainPathRegions(g)).toEqual(new Set(["in", "out"]))
  })

  it("names nothing at all when the way out cannot be reached from the way in", () => {
    const g = graph([["in", "stub"]], ["in", "stub", "out"], { in: "in", out: "out" })

    expect(mainPathRegions(g)).toEqual(new Set())
  })
})
