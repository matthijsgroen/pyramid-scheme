import { describe, expect, it } from "vitest"
import { topologyFaults } from "./obstacles"
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
