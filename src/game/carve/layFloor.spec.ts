import { describe, expect, it } from "vitest"
import { BINDING, mirrorForkLock, sluiceLock } from "../testSupport/lockFixtures"
import { layLockPlan, type LaidLocks } from "../layLocks"
import { seatLaidFloor, trimBareTails } from "../laidFloor"
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

describe("trimBareTails", () => {
  // A made-up sluice lock laid with nothing standing on it: every dead end off the route is bare.
  const prep = prepOf(
    plainFloor({ pathPuzzles: 0, difficulty: "expert", locks: [{ lock: sluiceLock() }], realisations: BINDING })
  )
  const { layPlan } = prep.sizing
  const plan = prep.input.plan!
  const lays = Array.from({ length: 10 }, (_, seed) =>
    layLockPlan(layPlan!, { seed: seed + 1, n: freshState(prep).rung.n })
  ).flatMap(result => (result.ok ? [result.laid] : []))
  const trim = (laid: LaidLocks) => trimBareTails(plan, layPlan!, laid, seatLaidFloor(plan, laid), new Set())

  it("cuts a lock's walk back off its bare dead ends, and leaves its route as laid", () => {
    const cut = lays.filter(laid => trim(laid) !== laid)
    expect(cut.length).toBeGreaterThan(0)
    for (const laid of cut) {
      expect(trim(laid).claimed.length).toBeLessThan(laid.claimed.length)
      expect(trim(laid).route).toEqual(laid.route)
    }
  })

  it("leaves nothing more to cut once cut", () => {
    for (const laid of lays) {
      const once = trim(laid)
      expect(trim(once)).toBe(once)
    }
  })
})
