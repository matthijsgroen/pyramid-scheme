import { describe, expect, it } from "vitest"
import {
  appetiteAccepts,
  fitContent,
  mainPathRegions,
  offRouteChains,
  regionOfStep,
  regionsAlongPath,
  STEPS_PER_REGION,
  regionRoute,
  strandedRegions,
  stretchOf,
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

  // A named region is tried before a free one. Reversing the order would let the reward spend the
  // free region, leaving the puzzle with nowhere to go — so this discriminates the two orders.
  it("gives the reward to the region that asked for it, leaving the free region for the puzzle", () => {
    const g = withAppetites(["in", "free"], ["vault", "reward"], ["out", "nothing"])
    const result = fitContent(g, { rewards: 1, puzzleRooms: 1 })

    expect(result.fits).toBe(true)
    expect(result.fits && result.placed.get("vault")).toEqual(["reward"])
    expect(result.fits && result.placed.get("in")).toEqual(["puzzle"])
  })
})

describe("the route the main path threads", () => {
  it("runs from the way in to the way out along a corridor of regions", () => {
    const g = graph(
      [
        ["in", "middle"],
        ["middle", "out"],
      ],
      ["in", "middle", "out"],
      { in: "in", out: "out" }
    )

    expect(regionRoute(g)).toEqual(["in", "middle", "out"])
  })

  // A pocket is not on the way anywhere: the main path threads the regions it must, and a side path
  // grows into the rest.
  it("leaves out a pocket that hangs off the route", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "pocket"],
      ],
      ["in", "pocket", "out"],
      { in: "in", out: "out" }
    )

    expect(regionRoute(g)).toEqual(["in", "out"])
  })

  // Two ways round, and the route has to pick one. Declaration order decides, so the same layout
  // always threads the same way.
  it("takes the earlier-declared branch when a fork rejoins, so the route is deterministic", () => {
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

    expect(regionRoute(g)).toEqual(["in", "left", "out"])
  })

  // The fixtures above all declare regions in the same order their connections list them, so they
  // cannot tell "declaration order" from the more fragile "first appearance in connections" apart.
  // Here the two disagree: connections mention left before right, but right is DECLARED before left —
  // so only a tie-break that reads declaration order reaches right first.
  it("follows the order the regions were declared in, not the order their connections were listed", () => {
    const g = graph(
      [
        ["in", "left"],
        ["in", "right"],
        ["left", "out"],
        ["right", "out"],
      ],
      ["in", "right", "left", "out"],
      { in: "in", out: "out" }
    )

    expect(regionRoute(g)).toEqual(["in", "right", "out"])
  })

  it("is the one region twice over where the way in is also the way out", () => {
    const g = graph([], ["only"], { in: "only", out: "only" })

    expect(regionRoute(g)).toEqual(["only"])
  })

  it("has no route at all where the way out cannot be reached", () => {
    const g = graph([["in", "stub"]], ["in", "stub", "out"], { in: "in", out: "out" })

    expect(regionRoute(g)).toEqual([])
  })
})

describe("which stretch of the main path is which region", () => {
  it("deals the steps evenly when they divide", () => {
    expect(regionOfStep(["a", "b"], 4)).toEqual(["a", "a", "b", "b"])
  })

  it("gives the extra step to the earlier region when they do not divide", () => {
    expect(regionOfStep(["a", "b"], 5)).toEqual(["a", "a", "a", "b", "b"])
  })

  it("spreads the remainder one each from the front, not all onto the first", () => {
    expect(regionOfStep(["a", "b", "c"], 5)).toEqual(["a", "a", "b", "b", "c"])
  })

  it("puts every step in the one region of a one-region route", () => {
    expect(regionOfStep(["only"], 3)).toEqual(["only", "only", "only"])
  })

  it("runs out of steps before the route ends, giving each step a region and no more", () => {
    expect(regionOfStep(["a", "b", "c"], 2)).toEqual(["a", "b"])
  })

  it("has nothing to deal where the route is empty", () => {
    expect(regionOfStep([], 3)).toEqual([])
  })
})

describe("the main path never names a region a side path is not free to skip", () => {
  // mainPathRegions has no production caller; this is what makes it meaningful anyway — a dominator on
  // the region graph is always somewhere on the shortest route, so the two must agree wherever the
  // graph is exercised above.
  const cases: Array<[string, RegionGraph]> = [
    [
      "a single corridor of regions",
      graph(
        [
          ["in", "middle"],
          ["middle", "out"],
        ],
        ["in", "middle", "out"],
        { in: "in", out: "out" }
      ),
    ],
    [
      "a fork that rejoins",
      graph(
        [
          ["in", "left"],
          ["in", "right"],
          ["left", "out"],
          ["right", "out"],
        ],
        ["in", "left", "right", "out"],
        { in: "in", out: "out" }
      ),
    ],
    [
      "a pocket hanging off the route",
      graph(
        [
          ["in", "out"],
          ["in", "pocket"],
        ],
        ["in", "pocket", "out"],
        { in: "in", out: "out" }
      ),
    ],
    [
      "a branch two regions deep off the route",
      graph(
        [
          ["in", "leftLower"],
          ["in", "rightLower"],
          ["rightLower", "s1Chamber"],
          ["leftLower", "out"],
        ],
        ["in", "rightLower", "s1Chamber", "leftLower", "out"],
        { in: "in", out: "out" }
      ),
    ],
  ]

  it.each(cases)("holds for %s", (_label, g) => {
    const route = new Set(regionRoute(g))
    for (const name of mainPathRegions(g)) expect(route.has(name)).toBe(true)
  })
})

describe("grouping the off-route regions a side path has to seat", () => {
  it("returns nothing when every region lies on the main route", () => {
    const g = graph(
      [
        ["in", "middle"],
        ["middle", "out"],
      ],
      ["in", "middle", "out"],
      { in: "in", out: "out" }
    )

    expect(offRouteChains(g)).toEqual([])
  })

  // doubleBack's own shape (docs/game-design/regions-and-containers.md, lockWalk.spec.ts's doubleBack
  // fixture): the route runs in → leftLower → out, leaving rightLower and s1Chamber off it — one
  // branch two regions deep, not two independent pendants, because s1Chamber hangs off rightLower
  // rather than off the route directly.
  it("groups a branch two regions deep into one chain, ordered from its mouth inward", () => {
    const g = graph(
      [
        ["in", "leftLower"],
        ["in", "rightLower"],
        ["rightLower", "s1Chamber"],
        ["leftLower", "out"],
      ],
      ["in", "rightLower", "s1Chamber", "leftLower", "out"],
      { in: "in", out: "out" }
    )

    expect(regionRoute(g)).toEqual(["in", "leftLower", "out"])
    expect(offRouteChains(g)).toEqual([{ mouth: "in", regions: ["rightLower", "s1Chamber"] }])
  })

  it("keeps two pendants off the same mouth as two separate chains, not one", () => {
    const g = graph(
      [
        ["in", "out"],
        ["in", "pocketA"],
        ["in", "pocketB"],
      ],
      ["in", "pocketA", "pocketB", "out"],
      { in: "in", out: "out" }
    )

    expect(offRouteChains(g)).toEqual([
      { mouth: "in", regions: ["pocketA"] },
      { mouth: "in", regions: ["pocketB"] },
    ])
  })

  // pocket touches the route at both "out" and "in" — the earlier-DECLARED region wins, so the same
  // layout always groups the same way regardless of which cell the carve happens to attach it near.
  it("takes the earliest-declared region as the mouth when a branch touches the route twice", () => {
    const g = graph(
      [
        ["in", "out"],
        ["out", "pocket"],
        ["in", "pocket"],
      ],
      ["in", "pocket", "out"],
      { in: "in", out: "out" }
    )

    expect(offRouteChains(g)).toEqual([{ mouth: "in", regions: ["pocket"] }])
  })
})

describe("where a placed container stands on the main path", () => {
  const route = ["in", "mid", "out"]
  const placed = (enters?: number) => ({
    ...graph(
      [
        ["in", "mid"],
        ["mid", "out"],
      ],
      ["in", "mid", "out"],
      { in: "in", out: "out" }
    ),
    ...(enters === undefined ? {} : { placement: { enters } }),
  })
  const U = undefined
  const along = (enters: number, steps: number) => regionsAlongPath(placed(enters), route, steps)
  const each = (name: string, n = STEPS_PER_REGION) => Array<string>(n).fill(name)

  it("deals the route across the whole path when nothing is placed, exactly as regionOfStep does", () => {
    for (const steps of [3, 4, 7, 12, 20]) {
      expect(regionsAlongPath(placed(), route, steps)).toEqual(regionOfStep(route, steps))
    }
  })

  it("gives each region of the route STEPS_PER_REGION steps and leaves the rest of the path ordinary", () => {
    expect(along(0.25, 24)).toEqual([
      ...Array<undefined>(6).fill(U),
      ...each("in"),
      ...each("mid"),
      ...each("out"),
      ...Array<undefined>(6).fill(U),
    ])
  })

  it("enters at the first step when the share is 0", () => {
    expect(along(0, 20)).toEqual([...each("in"), ...each("mid"), ...each("out"), ...Array<undefined>(8).fill(U)])
  })

  it("never takes the floor's last step, so the exit stays the floor's", () => {
    for (let steps = 7; steps <= 24; steps++) {
      for (const enters of [0, 0.25, 0.5, 0.75, 0.99]) {
        const result = along(enters, steps)
        expect(result).toHaveLength(steps)
        expect(result[steps - 1]).toBeUndefined()
      }
    }
  })

  it("seats only the front of the route when the stretch would run past the exit", () => {
    expect(along(0.8, 10)).toEqual([...Array<undefined>(8).fill(U), "in", U])
  })

  it("sizes the stretch from the container alone, whatever the path length", () => {
    for (const steps of [20, 30, 50]) {
      const { from, to } = stretchOf({ enters: 0.2 }, 3, steps)
      expect(to - from).toBe(3 * STEPS_PER_REGION)
    }
  })
})
