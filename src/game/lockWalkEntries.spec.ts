import { describe, expect, it } from "vitest"
import { describeLockWalkFailure, reachableStates, walkLock, type LockSpec } from "./lockWalk"
import { progressState, sequenceStates, spoiledState } from "./sequence"

type Route = "inOrder" | "wrongFirst" | "dropToFirst"

// Two tiles between the start and a door that opens once both are walked in order. The routes differ in
// which tile the ground meets first.
const plates = (route: Route): LockSpec => {
  const states = sequenceStates(2)
  const routes: Record<Route, Pick<LockSpec, "passages" | "oneWays">> = {
    inOrder: {
      passages: [
        { a: "start", b: "tile0" },
        { a: "tile0", b: "tile1" },
      ],
    },
    wrongFirst: {
      passages: [
        { a: "start", b: "tile1" },
        { a: "tile1", b: "tile0" },
      ],
    },
    dropToFirst: {
      passages: [
        { a: "start", b: "tile1" },
        { a: "tile0", b: "tile1" },
      ],
      oneWays: [{ from: "start", to: "tile0" }],
    },
  }
  return {
    regions: ["start", "tile0", "tile1", "vault"],
    gates: { door: { from: "tile1", to: "vault", owners: ["plates"] } },
    mechanisms: {
      plates: {
        states,
        initial: progressState(0),
        opens: { [progressState(2)]: ["door"] },
        transitions: states
          .filter(from => from !== progressState(0) && from !== progressState(2))
          .map(from => ({ from, to: progressState(0), at: "start" })),
        entries: [
          { from: progressState(0), to: progressState(1), at: "tile0" },
          { from: progressState(1), to: progressState(2), at: "tile1" },
          { from: progressState(0), to: spoiledState(0, 1), at: "tile1" },
        ],
        goal: { state: progressState(2), label: "sequence plates" },
      },
    },
    ...routes[route],
    in: "start",
    out: "vault",
  }
}

const statesOf = (spec: LockSpec) => {
  const found = reachableStates(spec)
  if (found === "tooLarge") throw new Error("too large")
  return found.order
}

describe("a tile's entry in the lock walk", () => {
  it("spoils the run when the walk enters the tile that is not yet due", () => {
    const spoiled = statesOf(plates("wrongFirst")).filter(state => state.config.plates === spoiledState(0, 1))
    expect(spoiled.length).toBeGreaterThan(0)
  })

  it("leaves no state standing on a tile whose entry has not fired", () => {
    const order = statesOf(plates("inOrder"))
    const at = (region: string) => order.filter(state => state.region === region).map(state => state.config.plates)
    expect(at("tile0")).not.toContain(progressState(0))
    expect(at("tile1")).not.toContain(progressState(0))
    expect(at("tile1")).not.toContain(progressState(1))
  })

  it("walks sound when the ground meets the tiles in the order", () => {
    expect(walkLock(plates("inOrder")).sound).toBe(true)
  })

  it("walks sound when a drop lets the walk reach the first tile first", () => {
    expect(walkLock(plates("dropToFirst")).sound).toBe(true)
  })

  it("refuses a lock whose only way to the first tile crosses the second, naming the sequence", () => {
    const walk = walkLock(plates("wrongFirst"))
    if (walk.sound) throw new Error("walked sound")
    expect(describeLockWalkFailure(walk.failure)).toContain("sequence plates")
  })

  it("does nothing on a tile the run has already passed", () => {
    const order = statesOf(plates("inOrder"))
    const done = order.filter(state => state.config.plates === progressState(2))
    expect(done.map(state => state.region)).toContain("tile0")
  })
})
