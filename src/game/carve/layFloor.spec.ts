import { describe, expect, it } from "vitest"
import { BINDING, mirrorForkLock } from "../testSupport/lockFixtures"
import { freshState, plainFloor, prepOf } from "./carveFixtures"
import { layFloor, routeOfLength } from "./layFloor"
import type { LockPlan } from "../lockPlan"

describe("layFloor", () => {
  it("lays nothing on a floor without a lock, and leaves the grid to the rung", () => {
    const state = freshState(prepOf(plainFloor()))
    expect(layFloor.run(prepOf(plainFloor()), state)).toBeUndefined()
    expect(state.lay).toBeNull()
    expect(state.laidN).toBe(state.rung.n)
  })

  it("lays a lock floor's route and names the grid it grew to", () => {
    const prep = prepOf(
      plainFloor({ pathPuzzles: 0, difficulty: "expert", locks: [{ lock: mirrorForkLock() }], realisations: BINDING })
    )
    const state = freshState(prep)
    expect(layFloor.run(prep, state)).toBeUndefined()
    expect(state.lay?.laid.route.length).toBeGreaterThan(1)
    expect(state.laidN).toBe(state.lay?.laid.n)
    expect(state.laidN).toBeGreaterThanOrEqual(state.rung.n)
  })
})

describe("routeOfLength", () => {
  // A made-up plan: two route regions of 2 nodes, two route corridors of 1 and an off-route corridor of 1.
  const plan = {
    regions: [
      { id: "a", onRoute: true, minNodes: 2 },
      { id: "b", onRoute: true, minNodes: 2 },
      { id: "side", onRoute: false, minNodes: 5 },
    ],
    corridors: [
      { id: "in-a", onRoute: true, minNodes: 1 },
      { id: "a-b", onRoute: true, minNodes: 1 },
      { id: "a-side", onRoute: false, minNodes: 1 },
    ],
  } as unknown as LockPlan
  const nodes = (laid: LockPlan) => laid.corridors.map(corridor => corridor.minNodes)

  it("shares what the route falls short of the floor's length evenly over its on-route corridors", () => {
    expect(nodes(routeOfLength(plan, 11))).toEqual([4, 3, 1])
  })

  it("lays a route the lock already makes long enough as planned", () => {
    expect(routeOfLength(plan, 6)).toBe(plan)
  })
})
