import { describe, expect, it } from "vitest"
import { resolveMechanicKind } from "./mechanics"
import {
  barrierRuns,
  crossesNoDoor,
  doorsToEnterRegion,
  fallingStretches,
  floorCorridors,
  seamIndexFor,
  topologyFaults,
} from "./obstacles"
import type { BarrierOrder, Control, Obstacle, OneWayObstacle, StatefulControl } from "./obstacles"
import type { RegionGraph } from "./regions"

// A linear chain plus one connection the route does not take, so "on the layout" and "on the route"
// are two different questions this fixture can tell apart.
const layout: RegionGraph = {
  regions: [
    { name: "mouth", appetite: "free" },
    { name: "hall", appetite: "free" },
    { name: "vault", appetite: "free" },
    { name: "cellar", appetite: "free" },
  ],
  connections: [
    ["mouth", "hall"],
    ["hall", "vault"],
    ["hall", "cellar"],
  ],
  in: "mouth",
  out: "vault",
}

const gate = (id: string, between: readonly [string, string]): Obstacle => ({
  id,
  kind: "gate",
  at: { on: "connection", between },
})

const oneWay = (id: string, between: readonly [string, string]): Obstacle => ({
  id,
  kind: "oneWay",
  at: { on: "connection", between },
})

const lever = (id: string, opens: Record<string, string[]>): StatefulControl => ({
  id,
  in: "mouth",
  states: ["left", "right"],
  initial: "left",
  returnsToInitial: true,
  opens,
})

describe("authored topology that resolves", () => {
  it("finds no fault in a gate on the route with a control that opens it", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "vault"])], [lever("s1", { left: ["g1"], right: [] })])

    expect(faults).toEqual([])
  })

  it("finds no fault in one control driving two gates from different states", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["mouth", "hall"]), gate("g2", ["hall", "vault"])],
      [lever("s1", { left: ["g1"], right: ["g2"] })]
    )

    expect(faults).toEqual([])
  })

  it("finds no fault in two controls driving one gate", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["hall", "vault"])],
      [lever("s1", { left: ["g1"], right: [] }), { ...lever("s2", { left: ["g1"], right: [] }), id: "s2" }]
    )

    expect(faults).toEqual([])
  })

  it("finds no fault at all when the floor authors neither", () => {
    expect(topologyFaults(undefined, [], [])).toEqual([])
  })

  // `cellar` hangs off `hall` (a pocket the route never threads — `regionRoute` runs mouth→hall→vault),
  // so this connection is a side path's own mouth rather than a step of the main route. A gate stands
  // there just as honestly: `offRouteChains` seats `cellar` on a chain grown from `hall`.
  it("finds no fault in a gate at a side chain's own mouth", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "cellar"])], [lever("s1", { left: ["g1"], right: [] })])

    expect(faults).toEqual([])
  })

  // A chain two regions deep (doubleBack's own shape): `rightLower` hangs off the route's `in`, and
  // `s1Chamber` hangs off `rightLower` in turn. The join WITHIN the chain is a boundary too, not just
  // the mouth where it leaves the route.
  it("finds no fault in a gate within a side chain, not on its mouth", () => {
    const branching: RegionGraph = {
      regions: [
        { name: "in", appetite: "free" },
        { name: "leftLower", appetite: "free" },
        { name: "out", appetite: "free" },
        { name: "rightLower", appetite: "free" },
        { name: "s1Chamber", appetite: "free" },
      ],
      connections: [
        ["in", "leftLower"],
        ["leftLower", "out"],
        ["in", "rightLower"],
        ["rightLower", "s1Chamber"],
      ],
      in: "in",
      out: "out",
    }
    const faults = topologyFaults(
      branching,
      [gate("g1", ["rightLower", "s1Chamber"])],
      [{ ...lever("s1", { left: ["g1"], right: [] }), in: "in" }]
    )

    expect(faults).toEqual([])
  })

  // `mouth` and `cellar` share no connection at all — the whole point of a one-way is a shortcut
  // between two regions the layout does not otherwise join, so unlike a gate it never has to answer
  // `joined`/`seatable`. No control owns it either: a one-way is meaningful on its own, its direction
  // fixed at whatever it was authored with.
  it("finds no fault in an unowned one-way between two regions the layout never joins", () => {
    const faults = topologyFaults(layout, [oneWay("drop1", ["mouth", "cellar"])], [])

    expect(faults).toEqual([])
  })
})

describe("authored topology that does not resolve", () => {
  it("names an obstacle id used twice", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["mouth", "hall"]), gate("g1", ["hall", "vault"])],
      [lever("s1", { left: ["g1"], right: [] })]
    )

    expect(faults).toContainEqual({ type: "obstacleIdRepeated", id: "g1" })
  })

  it("names an obstacle standing on a connection the layout does not have", () => {
    const faults = topologyFaults(layout, [gate("g1", ["mouth", "vault"])], [lever("s1", { left: ["g1"], right: [] })])

    expect(faults).toEqual([{ type: "obstacleNamesNoConnection", id: "g1" }])
  })

  // `cellar` touches the route twice — once at `hall`, once at `vault` — so `offRouteChains` takes
  // the earliest-declared as its mouth (`hall`) and the OTHER join is one the carve never turns into a
  // physical adjacency: `cellar`'s cells grow from `hall`'s side path alone, never touching `vault`'s.
  // That is a connection genuinely off both the route and every chain's own seam, still refused.
  it("names an obstacle on a connection the carve produces no seam for", () => {
    const doubleTouching: RegionGraph = {
      regions: [
        { name: "mouth", appetite: "free" },
        { name: "hall", appetite: "free" },
        { name: "vault", appetite: "free" },
        { name: "cellar", appetite: "free" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
        ["hall", "cellar"],
        ["vault", "cellar"],
      ],
      in: "mouth",
      out: "vault",
    }
    const faults = topologyFaults(
      doubleTouching,
      [gate("g1", ["vault", "cellar"])],
      [lever("s1", { left: ["g1"], right: [] })]
    )

    expect(faults).toEqual([
      { type: "obstacleOffRoute", id: "g1" },
      { type: "gateBypassed", id: "g1", between: ["vault", "cellar"] },
    ])
  })

  it("names an obstacle no control opens in any state", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "vault"])], [lever("s1", { left: [], right: [] })])

    expect(faults).toEqual([{ type: "obstacleUnowned", id: "g1" }])
  })

  it("names a control id used twice", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["hall", "vault"])],
      [lever("s1", { left: ["g1"], right: [] }), { ...lever("s1", { left: [], right: ["g1"] }), id: "s1" }]
    )

    expect(faults).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "s1" }])
  })

  it("names a control standing in no region of the layout", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["hall", "vault"])],
      [{ ...lever("s1", { left: ["g1"], right: [] }), in: "attic" }]
    )

    expect(faults).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "attic" }])
  })

  it("names a control starting in a state it does not have", () => {
    const faults = topologyFaults(
      layout,
      [gate("g1", ["hall", "vault"])],
      [{ ...lever("s1", { left: ["g1"], right: [] }), initial: "middle" }]
    )

    expect(faults).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "middle" }])
  })

  it("names a control opening gates in a state it does not have", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "vault"])], [lever("s1", { sideways: ["g1"] })])

    expect(faults).toContainEqual({ type: "controlUnsatisfied", id: "s1", what: "sideways" })
  })

  it("names a control opening an obstacle that does not exist", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "vault"])], [lever("s1", { left: ["g1", "g9"] })])

    expect(faults).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "g9" }])
  })

  it("names every obstacle and control when the floor authors no layout at all", () => {
    const faults = topologyFaults(undefined, [gate("g1", ["a", "b"])], [lever("s1", { left: ["g1"] })])

    expect(faults).toEqual([
      { type: "obstacleNamesNoConnection", id: "g1" },
      { type: "controlUnsatisfied", id: "s1", what: "mouth" },
    ])
  })

  // Unlike a gate, a one-way never needs `joined`/`seatable` — but it still needs both ends to be
  // regions this floor actually declares, and a floor with no layout at all declares none.
  it("names a one-way obstacle by its own reason when the floor authors no layout at all", () => {
    const faults = topologyFaults(undefined, [oneWay("drop1", ["a", "b"])], [])

    expect(faults).toEqual([{ type: "obstacleNamesNoRegion", id: "drop1" }])
  })

  it("names a one-way obstacle naming a region the layout does not declare", () => {
    const faults = topologyFaults(layout, [oneWay("drop1", ["mouth", "attic"])], [])

    expect(faults).toEqual([{ type: "obstacleNamesNoRegion", id: "drop1" }])
  })

  // `opens` can only ever name a GATE (Control.opens): "stands open" is not a question a one-way's
  // direction answers, so a control pointing `opens` at one is refused the same way as one pointing
  // at an obstacle that does not exist.
  it("names a control opening a one-way, which opens cannot express a direction for", () => {
    const faults = topologyFaults(
      layout,
      [oneWay("drop1", ["mouth", "cellar"])],
      [lever("s1", { left: ["drop1"], right: [] })]
    )

    expect(faults).toEqual([{ type: "controlUnsatisfied", id: "s1", what: "drop1" }])
  })
})

describe("seamIndexFor", () => {
  // Steps 0-1 mouth, 2-4 hall, 5-6 vault — a run with a multi-step stretch on both sides of the seam.
  const run = ["mouth", "mouth", "hall", "hall", "hall", "vault", "vault"]

  it("finds the seam in the middle of a run", () => {
    expect(seamIndexFor(run, ["hall", "vault"])).toBe(5)
  })

  it("finds the seam when the far region is exactly one step long", () => {
    const oneStepFar = ["mouth", "hall", "hall", "vault"]

    expect(seamIndexFor(oneStepFar, ["hall", "vault"])).toBe(3)
  })

  it("finds the same seam whichever order the two region names are given", () => {
    expect(seamIndexFor(run, ["hall", "vault"])).toBe(5)
    expect(seamIndexFor(run, ["vault", "hall"])).toBe(5)
  })

  // The gap-free layout `regionOfStep` produces today never reaches this case (see the comment above
  // this refusal in siteAssembler.ts) — but the question is answered honestly regardless of what
  // built `stepRegion`, which is what lets "no seam" be pinned down here rather than only inferred.
  it("answers undefined when the two regions are both present but not adjacent", () => {
    const gapped = ["mouth", "hall", "cellar", "vault"]

    expect(seamIndexFor(gapped, ["hall", "vault"])).toBeUndefined()
  })

  it("answers undefined when one of the two regions is missing entirely", () => {
    const missingVault = ["mouth", "hall", "hall"]

    expect(seamIndexFor(missingVault, ["hall", "vault"])).toBeUndefined()
  })
})

describe("the doors a region stands behind", () => {
  it("names nothing for a region in front of every gate", () => {
    const doors = doorsToEnterRegion(layout, [gate("g1", ["hall", "vault"])])

    expect(doors.get("mouth")).toEqual(new Set())
    expect(doors.get("hall")).toEqual(new Set())
  })

  it("names the gate for the region behind it", () => {
    const doors = doorsToEnterRegion(layout, [gate("g1", ["hall", "vault"])])

    expect(doors.get("vault")).toEqual(new Set(["g1"]))
  })

  it("names every gate on a chain of them, not just the nearest", () => {
    const doors = doorsToEnterRegion(layout, [gate("g1", ["mouth", "hall"]), gate("g2", ["hall", "vault"])])

    expect(doors.get("mouth")).toEqual(new Set())
    expect(doors.get("hall")).toEqual(new Set(["g1"]))
    expect(doors.get("vault")).toEqual(new Set(["g1", "g2"]))
    expect(doors.get("cellar")).toEqual(new Set(["g1"]))
  })

  it("names no gate a player can walk round", () => {
    // mouth—hall—vault and mouth—vault: the hall gate bounds nothing, because vault is reachable
    // without it.
    const ring: RegionGraph = {
      ...layout,
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
        ["mouth", "vault"],
      ],
    }
    const doors = doorsToEnterRegion(ring, [gate("g1", ["hall", "vault"])])

    expect(doors.get("vault")).toEqual(new Set())
  })

  it("gives every declared region an entry, so a caller never has to guess at an absent one", () => {
    const doors = doorsToEnterRegion(layout, [gate("g1", ["hall", "vault"])])

    expect([...doors.keys()].sort()).toEqual(["cellar", "hall", "mouth", "vault"])
  })
})

describe("an edge that crosses no door", () => {
  const behind = (...ids: string[]) => new Set(ids)

  it("allows two cells in front of every door", () => {
    expect(crossesNoDoor(behind(), behind())).toBe(true)
  })

  it("allows two cells behind the same one door", () => {
    expect(crossesNoDoor(behind("g1"), behind("g1"))).toBe(true)
  })

  it("allows two cells behind the same two doors, named in either order", () => {
    expect(crossesNoDoor(behind("g1", "g2"), behind("g2", "g1"))).toBe(true)
  })

  it("refuses an edge from open ground into a gated region", () => {
    expect(crossesNoDoor(behind(), behind("g1"))).toBe(false)
    expect(crossesNoDoor(behind("g1"), behind())).toBe(false)
  })

  it("refuses an edge that skips the second of two doors", () => {
    expect(crossesNoDoor(behind("g1"), behind("g1", "g2"))).toBe(false)
  })

  it("refuses an edge between two regions behind different doors, being past one earning nothing toward the other", () => {
    expect(crossesNoDoor(behind("g1"), behind("g2"))).toBe(false)
  })
})

describe("a floor laid from a lock plan", () => {
  // `cellar` meets the route twice, at `hall` and at `vault`. The lay stands a corridor on both joins.
  const loop: RegionGraph = {
    regions: [
      { name: "mouth", appetite: "free" },
      { name: "hall", appetite: "free" },
      { name: "vault", appetite: "free" },
      { name: "cellar", appetite: "free" },
    ],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
      ["hall", "cellar"],
      ["vault", "cellar"],
    ],
    in: "mouth",
    out: "vault",
  }
  // `cellar` holds two branches, `attic` and `crypt`; a side chain is laid as one line, a lock plan as a tree.
  const pendant: RegionGraph = {
    regions: [
      { name: "mouth", appetite: "free" },
      { name: "hall", appetite: "free" },
      { name: "vault", appetite: "free" },
      { name: "cellar", appetite: "free" },
      { name: "attic", appetite: "free" },
      { name: "crypt", appetite: "free" },
    ],
    connections: [
      ["mouth", "hall"],
      ["hall", "vault"],
      ["hall", "cellar"],
      ["cellar", "attic"],
      ["cellar", "crypt"],
    ],
    in: "mouth",
    out: "vault",
  }
  const bothSides = [gate("g1", ["vault", "cellar"]), gate("g2", ["hall", "cellar"])]

  it("seats a gate on the join that closes a loop", () => {
    const faults = topologyFaults(loop, bothSides, [lever("s1", { left: ["g1"], right: ["g2"] })], [], [], undefined, {
      laid: true,
    })
    expect(faults).toEqual([])
  })

  it("still refuses that gate on a floor carved as side chains", () => {
    const faults = topologyFaults(loop, bothSides, [lever("s1", { left: ["g1"], right: ["g2"] })])
    expect(faults).toEqual([{ type: "obstacleOffRoute", id: "g1" }])
  })

  it("seats a gate on the second branch of a pendant", () => {
    const faults = topologyFaults(
      pendant,
      [gate("g1", ["cellar", "crypt"])],
      [lever("s1", { left: ["g1"], right: [] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([])
    expect(
      topologyFaults(pendant, [gate("g1", ["cellar", "crypt"])], [lever("s1", { left: ["g1"], right: [] })])
    ).toEqual([{ type: "obstacleOffRoute", id: "g1" }])
  })

  it("names a gate an open way goes round, since no doorway could hold it", () => {
    const faults = topologyFaults(
      loop,
      [gate("g1", ["vault", "cellar"])],
      [lever("s1", { left: ["g1"], right: [] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([{ type: "gateBypassed", id: "g1", between: ["vault", "cellar"] }])
  })

  it("names it on a floor carved as side chains too (D4)", () => {
    const faults = topologyFaults(loop, [gate("g1", ["vault", "cellar"])], [lever("s1", { left: ["g1"], right: [] })])
    expect(faults).toContainEqual({ type: "gateBypassed", id: "g1", between: ["vault", "cellar"] })
  })

  it("is no way round through a barred region", () => {
    const ring: RegionGraph = {
      regions: [
        { name: "mouth", appetite: "free" },
        { name: "hall", appetite: "free" },
        { name: "vault", appetite: "free" },
        { name: "cellar", appetite: "free" },
        { name: "attic", appetite: "free" },
      ],
      connections: [
        ["mouth", "hall"],
        ["hall", "vault"],
        ["vault", "cellar"],
        ["cellar", "attic"],
        ["attic", "hall"],
      ],
      in: "mouth",
      out: "vault",
    }
    const flooded: Obstacle = { id: "flood", kind: "gate", at: { on: "region", region: "attic" } }
    const faults = topologyFaults(
      ring,
      [gate("g1", ["vault", "cellar"]), flooded],
      [lever("s1", { left: ["g1"], right: ["flood"] })],
      [],
      [],
      undefined,
      { laid: true }
    )
    expect(faults).toEqual([])
  })
})

describe("the corridors of a laid floor", () => {
  const layout = (connections: [string, string][]): RegionGraph => ({
    regions: ["in", "hall", "out"].map(name => ({ name, appetite: "free" as const })),
    connections,
    in: "in",
    out: "out",
  })
  const lever = (opens: string[]): Control => ({
    id: "S",
    in: "in",
    states: ["a", "b"],
    initial: "a",
    returnsToInitial: true,
    opens: { a: [], b: opens },
  })
  const gate = (id: string, corridor?: number): Obstacle => ({
    id,
    kind: "gate",
    at: { on: "connection", between: ["in", "hall"], ...(corridor === undefined ? {} : { corridor }) },
  })
  const fall: OneWayObstacle = { id: "fall", kind: "oneWay", at: { on: "connection", between: ["in", "hall"] } }
  const laid = (l: RegionGraph, obstacles: Obstacle[], controls: Control[], order: BarrierOrder[] = []) =>
    topologyFaults(l, obstacles, controls, [], order, resolveMechanicKind, { laid: true })

  it("stands a gate on the second corridor of a pair", () => {
    const twin = layout([
      ["in", "hall"],
      ["in", "hall"],
      ["hall", "out"],
    ])
    expect(laid(twin, [gate("A"), gate("B", 1)], [lever(["A", "B"])])).toEqual([])
  })

  it("refuses a gate an open corridor beside it goes round", () => {
    const twin = layout([
      ["in", "hall"],
      ["in", "hall"],
      ["hall", "out"],
    ])
    expect(laid(twin, [gate("A")], [lever(["A"])])).toEqual([
      { type: "gateBypassed", id: "A", between: ["in", "hall"] },
    ])
  })

  it("refuses a gate on a corridor its pair does not have", () => {
    expect(
      laid(
        layout([
          ["in", "hall"],
          ["hall", "out"],
        ]),
        [gate("A", 1)],
        [lever(["A"])]
      )
    ).toEqual([{ type: "obstacleNamesNoConnection", id: "A" }])
  })

  it("stands a gate on a falling corridor the layout does not join", () => {
    const order: BarrierOrder[] = [{ between: ["in", "hall"], barriers: ["A", "fall"] }]
    expect(
      laid(
        layout([
          ["in", "out"],
          ["out", "hall"],
        ]),
        [gate("A"), fall],
        [lever(["A"])],
        order
      )
    ).toEqual([])
  })

  it("never counts a falling corridor as a way round a gate, nor the gate on it as bypassed", () => {
    const order: BarrierOrder[] = [{ between: ["in", "hall"], barriers: ["A", "fall"], corridor: 1 }]
    expect(
      laid(
        layout([
          ["in", "hall"],
          ["hall", "out"],
        ]),
        [gate("A", 1), fall],
        [lever(["A"])],
        order
      )
    ).toEqual([])
  })

  it("orders the gates of one corridor apart from those of the corridor beside it", () => {
    const twin = layout([
      ["in", "hall"],
      ["in", "hall"],
      ["hall", "out"],
    ])
    const order: BarrierOrder[] = [{ between: ["in", "hall"], barriers: ["A", "B"], corridor: 1 }]
    expect(laid(twin, [gate("C"), gate("A", 1), gate("B", 1)], [lever(["A", "B", "C"])], order)).toEqual([])
    expect(laid(twin, [gate("C"), gate("A", 1), gate("B", 1)], [lever(["A", "B", "C"])])).toEqual([
      { type: "barrierUnordered", id: "A", between: ["in", "hall"] },
      { type: "barrierUnordered", id: "B", between: ["in", "hall"] },
    ])
  })

  it("numbers a pair's layout corridors round the index its falling corridor states", () => {
    const corridors = floorCorridors(
      layout([
        ["in", "hall"],
        ["in", "hall"],
        ["hall", "out"],
      ]),
      [gate("A"), gate("B", 2), gate("C", 1), fall],
      [{ between: ["in", "hall"], barriers: ["C", "fall"], corridor: 1 }]
    )
    expect(corridors.map(c => [c.between.join("-"), c.index, c.drop, c.barriers])).toEqual([
      ["in-hall", 0, undefined, ["A"]],
      ["in-hall", 2, undefined, ["B"]],
      ["hall-out", 0, undefined, []],
      ["in-hall", 1, "fall", ["C", "fall"]],
    ])
  })

  it("takes no corridor for an order naming a drop alone", () => {
    const corridors = floorCorridors(
      layout([
        ["in", "hall"],
        ["hall", "out"],
      ]),
      [gate("A"), fall],
      [{ between: ["in", "hall"], barriers: ["fall"] }]
    )
    expect(corridors.map(c => [c.between.join("-"), c.index, c.drop])).toEqual([
      ["in-hall", 0, undefined],
      ["hall-out", 0, undefined],
    ])
  })
})

describe("a falling corridor split at its drop", () => {
  const drop = (from: string, to: string): OneWayObstacle => ({
    id: "d",
    kind: "oneWay",
    at: { on: "connection", between: [from, to] },
  })
  it.each([
    [
      "a gate then a drop, written along the fall",
      ["A", "d"],
      ["in", "pit"],
      { A: "right" },
      { upstream: ["A"], downstream: [], align: { A: "right" } },
    ],
    [
      "a drop then a gate, written along the fall",
      ["d", "A"],
      ["in", "pit"],
      { A: "left" },
      { upstream: [], downstream: ["A"], align: { A: "left" } },
    ],
    [
      "a gate then a drop written against the fall (<<)",
      ["A", "d"],
      ["pit", "in"],
      { A: "left" },
      { upstream: [], downstream: ["A"], align: { A: "right" } },
    ],
    [
      "gates on both sides, written against the fall",
      ["A", "d", "B"],
      ["pit", "in"],
      { A: "center", B: "right" },
      { upstream: ["B"], downstream: ["A"], align: { A: "center", B: "left" } },
    ],
  ] as const)("%s", (_, barriers, [from, to], align, expected) => {
    expect(fallingStretches({ between: ["in", "pit"], barriers, align }, drop(from, to))).toEqual({
      launch: from,
      landing: to,
      ...expected,
    })
  })
})

describe("fork seams, sequences and orders read per corridor", () => {
  const layout = (connections: [string, string][]): RegionGraph => ({
    regions: ["in", "a", "b", "out"].map(name => ({ name, appetite: "free" as const })),
    connections,
    in: "in",
    out: "out",
  })
  const gate = (id: string, to: string, extra: { corridor?: number; owners?: string[] } = {}): Obstacle => ({
    id,
    kind: "gate",
    at: {
      on: "connection",
      between: ["in", to],
      ...(extra.corridor === undefined ? {} : { corridor: extra.corridor }),
    },
    ...(extra.owners ? { owners: extra.owners } : {}),
  })
  const drop: OneWayObstacle = { id: "d", kind: "oneWay", at: { on: "connection", between: ["in", "a"] } }
  const fork: Control = { id: "Y", in: "in", control: "fork-switch", encounter: "junction" }
  const lever = (opens: string[]): Control => ({
    id: "S",
    in: "in",
    states: ["a", "b"],
    initial: "a",
    returnsToInitial: true,
    opens: { a: [], b: opens },
  })
  const laid = (l: RegionGraph, obstacles: Obstacle[], controls: Control[], order: BarrierOrder[] = []) =>
    topologyFaults(l, obstacles, controls, [{ in: "in" }], order, resolveMechanicKind, { laid: true })
  const threeWays = layout([
    ["in", "a"],
    ["in", "b"],
    ["in", "out"],
  ])

  it("refuses a fork seam gated only on the falling corridor beside it", () => {
    const obstacles = [gate("Ya", "a", { corridor: 1, owners: ["Y"] }), drop, gate("Yb", "b", { owners: ["Y"] })]
    const order: BarrierOrder[] = [{ between: ["in", "a"], barriers: ["Ya", "d"], corridor: 1 }]
    expect(laid(threeWays, obstacles, [fork], order)).toEqual([
      { type: "forkSwitchSeamUngated", id: "Y", between: ["in", "a"] },
    ])
  })

  it("takes a fork gating a seam and the falling corridor beside it, not gating the seam twice", () => {
    const obstacles = [
      gate("Ya", "a", { owners: ["Y"] }),
      gate("Yf", "a", { corridor: 1, owners: ["Y"] }),
      drop,
      gate("Yb", "b", { owners: ["Y"] }),
    ]
    const order: BarrierOrder[] = [{ between: ["in", "a"], barriers: ["Yf", "d"], corridor: 1 }]
    expect(laid(threeWays, obstacles, [fork], order)).toEqual([])
  })

  it("refuses a fork's gate its falling corridor's order leaves out", () => {
    const obstacles = [
      gate("G1", "a", { owners: ["Y"] }),
      gate("G2", "a", { owners: ["Y"] }),
      drop,
      gate("Yb", "b", { owners: ["Y"] }),
    ]
    const twoWays = layout([
      ["in", "b"],
      ["in", "out"],
      ["out", "a"],
    ])
    const order: BarrierOrder[] = [{ between: ["in", "a"], barriers: ["G1", "d"] }]
    expect(laid(twoWays, obstacles, [fork], order)).toEqual([
      { type: "barrierUnordered", id: "G2", between: ["in", "a"] },
    ])
  })

  const sequence = (opens: string, step: string): Control => ({
    id: "Q",
    control: "sequence",
    steps: [{ in: "in" }, { in: step }],
    resetAt: opens,
    opens: { done: [opens] },
  })

  it("refuses a sequence step reached only past its own gate on a falling corridor", () => {
    const order: BarrierOrder[] = [{ between: ["in", "a"], barriers: ["A", "d"] }]
    expect(laid(layout([["in", "out"]]), [gate("A", "a"), drop], [sequence("A", "a")], order)).toEqual([
      { type: "sequenceStepBehindOwnDoor", id: "Q", step: 1 },
    ])
  })

  it("reaches a sequence step by the corridor beside the one its gate shuts", () => {
    const twin = layout([
      ["in", "a"],
      ["in", "a"],
      ["a", "out"],
    ])
    expect(laid(twin, [gate("C", "a"), gate("A", "a", { corridor: 1 })], [lever(["C"]), sequence("A", "a")])).toEqual(
      []
    )
  })

  it("refuses a gate standing where only a drop's order is written", () => {
    const order: BarrierOrder[] = [{ between: ["in", "a"], barriers: ["d"] }]
    expect(
      laid(
        layout([
          ["in", "out"],
          ["out", "a"],
        ]),
        [gate("A", "a"), drop],
        [lever(["A"])],
        order
      )
    ).toEqual([
      { type: "obstacleNamesNoConnection", id: "A" },
      { type: "barrierOrderNamesNoConnection", between: ["in", "a"] },
    ])
    expect(
      laid(
        layout([
          ["in", "a"],
          ["a", "out"],
        ]),
        [gate("A", "a"), drop],
        [lever(["A"])],
        order
      )
    ).toEqual([{ type: "barrierNotOnConnection", id: "d", between: ["in", "a"] }])
  })

  it("refuses a second falling order on one corridor as repeated, and only that", () => {
    const order: BarrierOrder[] = [
      { between: ["in", "a"], barriers: ["A", "d"] },
      { between: ["in", "a"], barriers: ["A", "d2"] },
    ]
    expect(
      laid(
        layout([
          ["in", "out"],
          ["out", "a"],
        ]),
        [gate("A", "a"), drop, { ...drop, id: "d2" }],
        [lever(["A"])],
        order
      )
    ).toEqual([{ type: "barrierOrderRepeated", between: ["in", "a"] }])
  })

  it("seats a side-chain floor's gates on a pair's first layout corridor only", () => {
    const twin = layout([
      ["in", "out"],
      ["in", "out"],
      ["out", "a"],
    ])
    const onOut = (id: string, corridor?: number): Obstacle => ({
      id,
      kind: "gate",
      at: { on: "connection", between: ["in", "out"], ...(corridor === undefined ? {} : { corridor }) },
    })
    const unlaid = (obstacles: Obstacle[], order: BarrierOrder[] = []) =>
      topologyFaults(twin, obstacles, [lever(obstacles.flatMap(o => (o.kind === "gate" ? [o.id] : [])))], [], order)
    expect(unlaid([onOut("A"), onOut("B", 1)])).toEqual([{ type: "obstacleOffRoute", id: "B" }])
    expect(unlaid([gate("F", "a"), drop], [{ between: ["in", "a"], barriers: ["F", "d"] }])).toEqual([
      { type: "obstacleOffRoute", id: "F" },
    ])
  })

  it("marks a run falling only where its order names a drop beside its gates", () => {
    const runs = barrierRuns(
      [gate("F", "a", { corridor: 1 }), drop, gate("B", "b")],
      [{ between: ["in", "a"], barriers: ["F", "d"], corridor: 1 }]
    )
    expect(runs.map(run => [run.gates.map(g => g.id), run.falling])).toEqual([
      [["F"], true],
      [["B"], undefined],
    ])
  })

  it("reads an order written from the other end of its layout corridor turned round, alignment included", () => {
    const [corridor] = floorCorridors(
      layout([["a", "in"]]),
      [gate("A", "a"), gate("B", "a")],
      [{ between: ["in", "a"], barriers: ["A", "B"], align: { A: "left", B: "center" } }]
    )
    expect(corridor).toMatchObject({ between: ["a", "in"], barriers: ["B", "A"], align: { A: "right", B: "center" } })
  })
})
