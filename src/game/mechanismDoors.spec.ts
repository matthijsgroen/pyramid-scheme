import { describe, expect, it } from "vitest"
import { openDoorsFor, throwMechanism } from "./mechanismDoors"
import { floorLock } from "./floorLock"
import { MECHANISM_AT_REST, type MechanismRecord } from "@/game/siteTypes"
import { gridWithMechanism } from "./testSupport/mechanismFixtures"

const ADDRESS = "s0#0/p1"

describe("openDoorsFor", () => {
  it("opens the one door the stored position names", () => {
    const grid = gridWithMechanism("s0#0/p1", [
      { state: "left", gateKeyId: "handle:dev#0#0#0:s1" },
      { state: "right", gateKeyId: "handle:dev#0#0#0:s2" },
    ])
    expect([...openDoorsFor(grid, 0, new Map([["s0#0/p1", "left"]]))]).toEqual(["handle:dev#0#0#0:s1"])
  })

  it("opens nothing for a mechanism at rest, and nothing for one never touched that starts there", () => {
    const grid = gridWithMechanism("s0#0/p1", [{ state: "left", gateKeyId: "handle:dev#0#0#0:s1" }])
    expect(openDoorsFor(grid, 0, new Map([["s0#0/p1", MECHANISM_AT_REST]])).size).toBe(0)
    expect(openDoorsFor(grid, 0, new Map()).size).toBe(0)
  })

  it("opens the initial position's doors for a mechanism the save holds no entry for at all", () => {
    const grid = gridWithMechanism(
      "s0#0/p1",
      [
        { state: "left", gateKeyId: "handle:dev#0#0#0:s1" },
        { state: "right", gateKeyId: "handle:dev#0#0#0:s2" },
      ],
      { initial: "right" }
    )
    expect([...openDoorsFor(grid, 0, new Map())]).toEqual(["handle:dev#0#0#0:s2"])
  })

  it("ignores a stored position this build no longer has", () => {
    const grid = gridWithMechanism("s0#0/p1", [{ state: "left", gateKeyId: "handle:dev#0#0#0:s1" }])
    expect(openDoorsFor(grid, 0, new Map([["s0#0/p1", "gone"]])).size).toBe(0)
  })
})

describe("throwMechanism", () => {
  const handle: MechanismRecord = {
    states: ["left", "right"],
    initial: "left",
    returnsToInitial: true,
    positions: [],
  }

  it("flips a genuine handle's two states either way", () => {
    expect(throwMechanism(handle, "left")).toBe("right")
    expect(throwMechanism(handle, "right")).toBe("left")
  })

  // doubleBack's Y: a third, leading state that names only where it starts — never a press's target,
  // so the current state landing there still throws to one of the real two rather than standing still.
  const threeState: MechanismRecord = {
    states: ["unset", "left", "right"],
    initial: "unset",
    returnsToInitial: false,
    positions: [],
  }

  it("throws a mechanism resting on its unreachable initial state to the first of its two real ones", () => {
    expect(throwMechanism(threeState, "unset")).toBe("left")
  })

  it("still flips the two real states of a three-state mechanism once it has left the initial one", () => {
    expect(throwMechanism(threeState, "left")).toBe("right")
    expect(throwMechanism(threeState, "right")).toBe("left")
  })
})

// THE SOLVER AND THE PLAYER MUST AGREE ON WHAT A MECHANISM CAN REACH. The solver (floorLock) proves
// a floor sound from the states it says a mechanism can get to; if play can get anywhere else, or
// cannot get somewhere the solver relied on, the proof is about a different game.
describe("what throwMechanism reaches is what the lock solver says is reachable", () => {
  const shapes: [string, string[], string, boolean][] = [
    ["a two-state returning lever", ["left", "right"], "left", true],
    ["a two-state non-returning torch", ["unlit", "lit"], "unlit", false],
    ["a three-state non-returning mechanism whose initial is unreachable", ["unset", "left", "right"], "unset", false],
    ["a three-state returning mechanism", ["low", "mid", "high"], "low", true],
    ["a three-state non-returning mechanism starting in the middle", ["a", "b", "c"], "b", false],
  ]

  const solverEdges = (states: string[], initial: string, returnsToInitial: boolean) => {
    const grid = gridWithMechanism(ADDRESS, [], { states, initial, returnsToInitial })
    const lock = floorLock(grid)
    const found = Object.values(lock?.mechanisms ?? {})
    expect(found).toHaveLength(1)
    return found[0].transitions.map(({ from, to }) => [from, to] as const)
  }

  const closure = (initial: string, next: (from: string) => string[]) => {
    const seen = new Set([initial])
    for (const state of seen) for (const to of next(state)) seen.add(to)
    return seen
  }

  it.each(shapes)("%s", (_name, states, initial, returnsToInitial) => {
    const record: MechanismRecord = { states, initial, returnsToInitial, positions: [] }
    const edges = solverEdges(states, initial, returnsToInitial)
    const solverReaches = closure(initial, from => edges.filter(([f]) => f === from).map(([, to]) => to))

    // Play: press for ever from the initial state and write down every state it stands in.
    const played = new Set([initial])
    let at = initial
    for (let i = 0; i < states.length * 3; i++) {
      const to = throwMechanism(record, at)
      // every single press is a move the solver also allows (or no move at all)
      if (to !== at) expect(edges).toContainEqual([at, to])
      played.add(to)
      at = to
    }
    expect([...played].sort()).toEqual([...solverReaches].sort())

    // A state the solver gives no way out of is one a press leaves alone, and the other way round.
    for (const state of solverReaches)
      expect(throwMechanism(record, state) === state).toBe(!edges.some(([from]) => from === state))

    // Whether the mechanism can be put back where it started is the same answer from both.
    let reentered = false
    at = initial
    for (let i = 0; i < states.length * 3; i++) {
      at = throwMechanism(record, at)
      if (at === initial) reentered = true
    }
    expect(reentered).toBe(edges.some(([, to]) => to === initial))
  })

  it("leaves a two-state non-returning mechanism in its second state however often it is pressed", () => {
    const torch: MechanismRecord = {
      states: ["unlit", "lit"],
      initial: "unlit",
      returnsToInitial: false,
      positions: [],
    }
    expect(throwMechanism(torch, throwMechanism(torch, "unlit"))).toBe("lit")
  })

  it("toggles a returning lever for ever", () => {
    const lever: MechanismRecord = { states: ["left", "right"], initial: "left", returnsToInitial: true, positions: [] }
    let at = "left"
    for (let i = 0; i < 6; i++) at = throwMechanism(lever, at)
    expect(at).toBe("left")
    expect(throwMechanism(lever, "left")).toBe("right")
  })
})
