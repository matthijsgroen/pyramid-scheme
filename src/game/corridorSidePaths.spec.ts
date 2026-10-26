import { describe, expect, it } from "vitest"
import { assignCorridors, eligibleCorridors } from "./corridorSidePaths"
import type { LockPlan, PlanCorridor, PlanRegion } from "./lockPlan"
import type { ContentKind, RegionAppetite } from "./regions"

const region = (id: string, more: Partial<PlanRegion> = {}): PlanRegion => ({
  id,
  onRoute: false,
  seats: [],
  minNodes: 1,
  ...more,
})

const corridor = (from: string, to: string, onRoute: boolean): PlanCorridor => ({
  id: `${from}>${to}`,
  from,
  to,
  onRoute,
  barriers: [],
  minNodes: 0,
})

// entrance -> a -> b -> exit along the route; `side` hangs off a and `annex` off b.
const plan = (more: Partial<LockPlan> = {}): LockPlan => ({
  route: ["entrance", "a", "b", "exit"],
  regions: [
    region("entrance", { onRoute: true }),
    region("a", { onRoute: true }),
    region("b", { onRoute: true }),
    region("exit", { onRoute: true }),
    region("side"),
    region("annex"),
  ],
  corridors: [
    corridor("entrance", "a", true),
    corridor("a", "b", true),
    corridor("a", "side", false),
    corridor("b", "exit", true),
    corridor("b", "annex", false),
  ],
  junctions: [],
  drops: [],
  nested: [],
  ...more,
})

const FREE = new Map<string, RegionAppetite>()
const ids = (corridors: readonly PlanCorridor[]) => corridors.map(c => c.id)
const sections = (...puzzles: number[]): { section: number; kinds: ContentKind[] }[] =>
  puzzles.map((count, section) => ({
    section,
    kinds: [...Array.from({ length: count }, (): ContentKind => "puzzle"), "reward"],
  }))

describe("the corridors a side path may stand on", () => {
  it("an off-route corridor is offered before an on-route one", () => {
    expect(ids(eligibleCorridors(plan(), FREE))).toEqual(["a>side", "b>annex", "entrance>a", "a>b", "b>exit"])
  })

  it("a corridor carrying a drop, a junction's arm, a sequence threshold or a spliced nest spot is never offered", () => {
    const base = plan()
    const withAll = plan({
      regions: [
        ...base.regions.map(r =>
          r.id === "annex" ? { ...r, seats: [{ for: "threshold" as const, control: "plates", step: 0 }] } : r
        ),
        region("chute:ledge", { answersTo: "b" }),
        region("inner.foyer", { owner: "inner", onRoute: true }),
      ],
      corridors: [...base.corridors, corridor("b", "chute:ledge", false), corridor("entrance", "inner.foyer", true)],
      junctions: [{ region: "a", control: "Y", arms: ["a>side"] }],
      drops: [{ id: "chute", launch: "chute:ledge", landing: "a" }],
      nested: [{ host: "outer", between: ["entrance", "a"], instance: "inner" }],
    })
    expect(ids(eligibleCorridors(withAll, FREE))).toEqual(["a>b", "b>exit"])
  })

  it("a corridor between regions that take nothing is never offered", () => {
    const appetite = new Map<string, RegionAppetite>([
      ["a", "nothing"],
      ["side", "nothing"],
      ["b", "puzzles"],
      ["annex", "nothing"],
    ])
    expect(ids(eligibleCorridors(plan(), appetite))).toEqual(["b>annex", "entrance>a", "a>b", "b>exit"])
  })
})

describe("pairing side sections with corridors", () => {
  const corridors = eligibleCorridors(plan(), FREE)

  it("sections pair with corridors in authored order, one each", () => {
    expect(assignCorridors(corridors, sections(1, 0, 2), FREE)).toEqual([
      { section: 0, corridor: "a>side" },
      { section: 1, corridor: "b>annex" },
      { section: 2, corridor: "entrance>a" },
    ])
  })

  it("with more sections than corridors, a corridor takes a second only after every corridor has one", () => {
    const assigned = assignCorridors(corridors.slice(0, 2), sections(0, 0, 0, 0, 0), FREE)
    expect(assigned.map(a => a.corridor)).toEqual(["a>side", "b>annex", "a>side", "b>annex", "a>side"])
  })

  it("a section no corridor's appetite takes is left unassigned", () => {
    const appetite = new Map<string, RegionAppetite>([
      ["entrance", "nothing"],
      ["a", "puzzles"],
      ["b", "puzzles"],
      ["side", "puzzles"],
      ["annex", "reward"],
      ["exit", "nothing"],
    ])
    const offered = eligibleCorridors(plan(), appetite)
    const onlyPuzzles = [{ section: 4, kinds: ["puzzle", "puzzle"] as ContentKind[] }]
    // Only the annex takes a chest, so the section ending in one goes there and the puzzles-only one takes the first.
    expect(assignCorridors(offered, [...sections(1), ...onlyPuzzles], appetite)).toEqual([
      { section: 0, corridor: "b>annex" },
      { section: 4, corridor: "a>side" },
    ])
    const nowhere = new Map<string, RegionAppetite>([...appetite, ["annex", "puzzles"]])
    expect(assignCorridors(eligibleCorridors(plan(), nowhere), sections(1), nowhere)).toEqual([])
  })

  it("the same plan and sections always give the same assignment", () => {
    const first = assignCorridors(eligibleCorridors(plan(), FREE), sections(2, 1, 0, 3, 1, 0, 2), FREE)
    for (let i = 0; i < 5; i++)
      expect(assignCorridors(eligibleCorridors(plan(), FREE), sections(2, 1, 0, 3, 1, 0, 2), FREE)).toEqual(first)
  })
})
