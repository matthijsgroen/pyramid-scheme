import { describe, expect, it } from "vitest"
import {
  appetiteAccepts,
  fitContent,
  mainPathRegions,
  strandedRegions,
  type RegionAppetite,
  type RegionGraph,
} from "./regions"

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

describe("regions nothing reaches", () => {
  it("finds none where every region is joined to the way in", () => {
    const g = graph(
      [
        ["in", "middle"],
        ["middle", "out"],
      ],
      ["in", "middle", "out"],
      { in: "in", out: "out" }
    )

    expect(strandedRegions(g)).toEqual([])
  })

  // Loot in a region no walk reaches is loot nobody can collect, which is why this is required
  // rather than advisory.
  it("names a region joined to nothing, in the order it was authored", () => {
    const g = graph([["in", "out"]], ["in", "out", "orphan", "alsoOrphan"], { in: "in", out: "out" })

    expect(strandedRegions(g)).toEqual(["orphan", "alsoOrphan"])
  })

  it("names a region joined only to another region nothing reaches", () => {
    const g = graph(
      [
        ["in", "out"],
        ["orphan", "behindOrphan"],
      ],
      ["in", "out", "orphan", "behindOrphan"],
      { in: "in", out: "out" }
    )

    expect(strandedRegions(g)).toEqual(["orphan", "behindOrphan"])
  })
})

const withAppetites = (...regions: Array<[string, RegionAppetite]>): RegionGraph => ({
  regions: regions.map(([name, appetite]) => ({ name, appetite })),
  connections: regions.slice(1).map(([name], i) => [regions[i][0], name] as const),
  in: regions[0][0],
  out: regions[regions.length - 1][0],
})

describe("fitting a floor's content to what its regions will take", () => {
  it("puts each reward in a region that asked for one", () => {
    const g = withAppetites(["in", "nothing"], ["vault", "reward"], ["out", "nothing"])
    const result = fitContent(g, { rewards: 1, puzzleRooms: 0 })

    expect(result.fits).toBe(true)
    expect(result.fits && result.placed.get("vault")).toEqual(["reward"])
  })

  it("puts every puzzle room in the one region that takes them", () => {
    const g = withAppetites(["in", "nothing"], ["hall", "puzzles"], ["out", "nothing"])
    const result = fitContent(g, { rewards: 0, puzzleRooms: 3 })

    expect(result.fits && result.placed.get("hall")).toEqual(["puzzle", "puzzle", "puzzle"])
  })

  // The builder may refuse, but it may never decide quietly: a third reward with two places to put one
  // is the author's mistake, and it is named before a wall is carved rather than dropped.
  it("refuses by kind when a region asked for is not there", () => {
    const g = withAppetites(["in", "nothing"], ["vault", "reward"], ["out", "nothing"])

    expect(fitContent(g, { rewards: 2, puzzleRooms: 0 })).toEqual({ fits: false, unplaced: "reward" })
  })

  it("refuses a puzzle room where every region is promised empty", () => {
    const g = withAppetites(["in", "nothing"], ["out", "nothing"])

    expect(fitContent(g, { rewards: 0, puzzleRooms: 1 })).toEqual({ fits: false, unplaced: "puzzle" })
  })

  it("spends a free region only once the region that asked for the kind is full", () => {
    const g = withAppetites(["in", "free"], ["vault", "reward"], ["out", "nothing"])
    const result = fitContent(g, { rewards: 2, puzzleRooms: 0 })

    expect(result.fits && result.placed.get("vault")).toEqual(["reward"])
    expect(result.fits && result.placed.get("in")).toEqual(["reward"])
  })
})
