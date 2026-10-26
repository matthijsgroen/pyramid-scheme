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

// entrance -> a -> b -> exit along the route; `side` hangs off a and `annex` off b. All but the floor's own entrance
// and exit are the lock's regions.
const plan = (more: Partial<LockPlan> = {}): LockPlan => ({
  route: ["entrance", "a", "b", "exit"],
  regions: [
    region("entrance", { onRoute: true }),
    region("a", { onRoute: true, owner: "lock" }),
    region("b", { onRoute: true, owner: "lock" }),
    region("exit", { onRoute: true }),
    region("side", { owner: "lock" }),
    region("annex", { owner: "lock" }),
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
    expect(ids(eligibleCorridors(plan(), FREE))).toEqual(["a>side", "b>annex", "a>b"])
  })

  it("a corridor touching the floor's entrance or exit is never offered, only one with both ends in the lock", () => {
    const offered = ids(eligibleCorridors(plan(), FREE))
    expect(offered).not.toContain("entrance>a")
    expect(offered).not.toContain("b>exit")
    const unowned = plan({ regions: plan().regions.map(({ owner: _owner, ...r }) => r) })
    expect(ids(eligibleCorridors(unowned, FREE))).toEqual([])
  })

  it("a corridor carrying a drop, a junction's arm, a sequence threshold or a spliced nest spot is never offered", () => {
    const base = plan()
    const withAll = plan({
      regions: [
        ...base.regions.map(r =>
          r.id === "annex" ? { ...r, seats: [{ for: "threshold" as const, control: "plates", step: 0 }] } : r
        ),
        region("chute:ledge", { answersTo: "b", owner: "lock" }),
        region("nook", { owner: "lock" }),
        region("inner.foyer", { owner: "inner" }),
      ],
      corridors: [
        ...base.corridors,
        corridor("b", "chute:ledge", false),
        corridor("a", "nook", false),
        corridor("nook", "inner.foyer", false),
      ],
      junctions: [{ region: "a", control: "Y", arms: ["a>side"] }],
      drops: [{ id: "chute", launch: "chute:ledge", landing: "a" }],
      nested: [{ host: "lock", between: ["a", "nook"], instance: "inner" }],
    })
    expect(ids(eligibleCorridors(withAll, FREE))).toEqual(["a>b"])
  })

  it("a corridor between regions that take nothing is never offered", () => {
    const appetite = new Map<string, RegionAppetite>([
      ["a", "nothing"],
      ["side", "nothing"],
      ["b", "puzzles"],
      ["annex", "nothing"],
    ])
    expect(ids(eligibleCorridors(plan(), appetite))).toEqual(["b>annex", "a>b"])
  })
})

describe("pairing side sections with corridors", () => {
  const corridors = eligibleCorridors(plan(), FREE)

  it("sections pair with corridors in authored order, one each", () => {
    expect(assignCorridors(corridors, sections(1, 0, 2), FREE, plan())).toEqual([
      { section: 0, corridor: "a>side" },
      { section: 1, corridor: "b>annex" },
      { section: 2, corridor: "a>b" },
    ])
  })

  it("with more sections than corridors, a corridor takes one and the sections past them are left out", () => {
    const assigned = assignCorridors(corridors.slice(0, 2), sections(0, 0, 0, 0, 0), FREE, plan())
    expect(assigned).toEqual([
      { section: 0, corridor: "a>side" },
      { section: 1, corridor: "b>annex" },
    ])
  })

  it("asked for two a corridor, a corridor takes a second only after every corridor has one, and never a third", () => {
    const assigned = assignCorridors(corridors.slice(0, 2), sections(0, 0, 0, 0, 0), FREE, plan(), 2)
    expect(assigned.map(a => a.corridor)).toEqual(["a>side", "b>annex", "a>side", "b>annex"])
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
    expect(assignCorridors(offered, [...sections(1), ...onlyPuzzles], appetite, plan())).toEqual([
      { section: 0, corridor: "b>annex" },
      { section: 4, corridor: "a>side" },
    ])
    const nowhere = new Map<string, RegionAppetite>([...appetite, ["annex", "puzzles"]])
    expect(assignCorridors(eligibleCorridors(plan(), nowhere), sections(1), nowhere, plan())).toEqual([])
  })

  it("a corridor whose ends take every kind between them, but whose laid half puts no node where a room needs one, is not taken", () => {
    // A door with nothing aligned stands at the corridor's `from` end, so every spare node answers to `to`.
    const appetite = new Map<string, RegionAppetite>([
      ["a", "puzzles"],
      ["b", "reward"],
    ])
    const route = [corridor("entrance", "a", true), corridor("b", "exit", true)]
    const doored = plan({ corridors: [...route, { ...corridor("a", "b", true), barriers: ["G"] }] })
    expect(assignCorridors(eligibleCorridors(doored, appetite), sections(1), appetite, doored)).toEqual([])
    const open = plan({ corridors: [...route, corridor("a", "b", true)] })
    expect(assignCorridors(eligibleCorridors(open, appetite), sections(1), appetite, open)).toEqual([
      { section: 0, corridor: "a>b" },
    ])
  })

  it("a corridor is taken only when its rooms seat in the order the fill walks it, from the end nearer the way in", () => {
    // The fill walks a>side from a: a puzzle on side and the chest after it on a would be seated walking in from side.
    const backwards = new Map<string, RegionAppetite>([
      ["a", "reward"],
      ["side", "puzzles"],
    ])
    const offRoute = (taking: Map<string, RegionAppetite>, p: LockPlan) =>
      assignCorridors(
        eligibleCorridors(p, taking).filter(c => c.id.includes("side")),
        sections(1),
        taking,
        p
      )
    expect(offRoute(backwards, plan())).toEqual([])
    // Written side>a, the corridor is still walked from a, its `to` end.
    const forwards = new Map<string, RegionAppetite>([
      ["a", "puzzles"],
      ["side", "reward"],
    ])
    const written = plan({
      corridors: plan().corridors.map(c => (c.id === "a>side" ? corridor("side", "a", false) : c)),
    })
    expect(offRoute(forwards, written)).toEqual([{ section: 0, corridor: "side>a" }])
  })

  it("a corridor on a loop, reached from both ends, is taken only when its rooms seat walked either way", () => {
    const appetite = new Map<string, RegionAppetite>([
      ["a", "puzzles"],
      ["side", "reward"],
    ])
    const loop = plan({ corridors: [...plan().corridors, corridor("side", "b", false)] })
    const offered = eligibleCorridors(loop, appetite).filter(c => c.id === "a>side")
    expect(assignCorridors(offered, sections(1), appetite, loop)).toEqual([])
    expect(assignCorridors(offered, sections(1), appetite, plan())).toEqual([{ section: 0, corridor: "a>side" }])
  })

  it("the same plan and sections always give the same assignment", () => {
    const first = assignCorridors(eligibleCorridors(plan(), FREE), sections(2, 1, 0, 3, 1, 0, 2), FREE, plan())
    for (let i = 0; i < 5; i++)
      expect(assignCorridors(eligibleCorridors(plan(), FREE), sections(2, 1, 0, 3, 1, 0, 2), FREE, plan())).toEqual(
        first
      )
  })
})
