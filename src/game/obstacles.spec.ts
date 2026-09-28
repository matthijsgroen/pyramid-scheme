import { describe, expect, it } from "vitest"
import { crossesNoDoor, doorsToEnterRegion, seamIndexFor, topologyFaults } from "./obstacles"
import type { Control, Obstacle } from "./obstacles"
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

const lever = (id: string, opens: Record<string, string[]>): Control => ({
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

  it("names an obstacle on a connection the route never threads", () => {
    const faults = topologyFaults(layout, [gate("g1", ["hall", "cellar"])], [lever("s1", { left: ["g1"], right: [] })])

    expect(faults).toEqual([{ type: "obstacleOffRoute", id: "g1" }])
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
