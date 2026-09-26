import { describe, expect, it } from "vitest"
import {
  checkLockSpec,
  openGates,
  reachableStates,
  MAX_LOCK_STATES,
  walkLock,
  describeLockWalkFailure,
  type LockSpec,
} from "./lockWalk"

// A lock with one door and one key behind nothing: the smallest thing that reads.
const oneDoor = (): LockSpec => ({
  regions: ["entrance", "vault"],
  gates: { door: { from: "entrance", to: "vault", owners: ["key"] } },
  mechanisms: {
    key: {
      states: ["absent", "held"],
      initial: "absent",
      opens: { absent: [], held: ["door"] },
      transitions: [{ from: "absent", to: "held", at: "entrance" }],
    },
  },
  in: "entrance",
  out: "vault",
})

describe("checkLockSpec", () => {
  it("passes a lock whose every id names something", () => {
    expect(checkLockSpec(oneDoor())).toBeUndefined()
  })

  it("names a gate that leads to a region nobody declared", () => {
    const spec = oneDoor()
    spec.gates.door.to = "valut"
    expect(checkLockSpec(spec)).toContain("valut")
  })

  it("names a mechanism opening a gate that does not exist", () => {
    const spec = oneDoor()
    spec.mechanisms.key.opens.held = ["dor"]
    expect(checkLockSpec(spec)).toContain("dor")
  })

  it("names a mechanism opening a gate it does not own", () => {
    const spec = oneDoor()
    spec.gates.door.owners = ["other"]
    spec.mechanisms.other = { states: ["shut"], initial: "shut", opens: { shut: [] }, transitions: [] }
    spec.mechanisms.key.opens.held = ["door"]
    expect(checkLockSpec(spec)).toContain("does not own")
  })

  it("refuses a gate with no owner, which would be open or shut by accident of the fold", () => {
    const spec = oneDoor()
    spec.gates.door.owners = []
    expect(checkLockSpec(spec)).toContain("no owner")
  })

  it("names a mechanism starting in a state it does not have", () => {
    const spec = oneDoor()
    spec.mechanisms.key.initial = "lost"
    expect(checkLockSpec(spec)).toContain("lost")
  })

  it("names a transition thrown from a region nobody declared", () => {
    const spec = oneDoor()
    spec.mechanisms.key.transitions[0].at = "entrence"
    expect(checkLockSpec(spec)).toContain("entrence")
  })
})

// A gate with two owners, each a two-state mechanism that opens it in "on".
const twoOwners = (mode: "all" | "any"): LockSpec => ({
  regions: ["entrance", "vault"],
  gates: { sluice: { from: "entrance", to: "vault", owners: ["flood", "lever"], mode } },
  mechanisms: {
    flood: {
      states: ["off", "on"],
      initial: "off",
      opens: { off: [], on: ["sluice"] },
      transitions: [{ from: "off", to: "on", at: "entrance" }],
    },
    lever: {
      states: ["off", "on"],
      initial: "off",
      opens: { off: [], on: ["sluice"] },
      transitions: [{ from: "off", to: "on", at: "entrance" }],
    },
  },
  in: "entrance",
  out: "vault",
})

describe("openGates", () => {
  it("opens a single-owner gate exactly in the states its owner names", () => {
    const spec = oneDoor()
    expect([...openGates(spec, { key: "absent" })]).toEqual([])
    expect([...openGates(spec, { key: "held" })]).toEqual(["door"])
  })

  it("holds an all-gate shut while one owner still says shut", () => {
    const spec = twoOwners("all")
    expect([...openGates(spec, { flood: "on", lever: "off" })]).toEqual([])
    expect([...openGates(spec, { flood: "on", lever: "on" })]).toEqual(["sluice"])
  })

  it("opens an any-gate on one owner alone", () => {
    const spec = twoOwners("any")
    expect([...openGates(spec, { flood: "on", lever: "off" })]).toEqual(["sluice"])
    expect([...openGates(spec, { flood: "off", lever: "off" })]).toEqual([])
  })

  it("defaults a multi-owner gate to all, so one owner alone does not open it", () => {
    const spec = twoOwners("all")
    delete spec.gates.sluice.mode
    expect([...openGates(spec, { flood: "on", lever: "off" })]).toEqual([])
    expect([...openGates(spec, { flood: "on", lever: "on" })]).toEqual(["sluice"])
  })
})

const states = (spec: LockSpec) => {
  const found = reachableStates(spec)
  if (found === "tooLarge") throw new Error("expected a walkable lock")
  return found.order.map(state => `${state.region}|${Object.values(state.config).join(",")}`)
}

describe("reachableStates", () => {
  it("walks from the way in, taking the key and then the door", () => {
    expect(states(oneDoor())).toEqual(["entrance|absent", "entrance|held", "vault|held"])
  })

  it("never walks through a door no state opens", () => {
    const spec = oneDoor()
    spec.mechanisms.key.transitions = []
    expect(states(spec)).toEqual(["entrance|absent"])
  })

  it("takes a one-way out of a region nothing else leaves", () => {
    const spec = oneDoor()
    spec.mechanisms.key.transitions = []
    spec.oneWays = [{ from: "entrance", to: "vault" }]
    expect(states(spec)).toEqual(["entrance|absent", "vault|absent"])
  })

  it("lets the player who reached the way out come back in at the entrance", () => {
    const spec = oneDoor()
    spec.mechanisms.key.transitions = []
    spec.oneWays = [{ from: "entrance", to: "vault" }]
    const found = reachableStates(spec)
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    const fromVault = found.edges[1].map(n => found.order[n].region)
    expect(fromVault).toContain("entrance")
  })

  it("refuses a lock naming more states than it will walk", () => {
    const spec: LockSpec = { regions: ["entrance"], gates: {}, mechanisms: {}, in: "entrance", out: "entrance" }
    for (let n = 0; n < 12; n++)
      spec.mechanisms[`m${n}`] = {
        states: ["a", "b", "c", "d", "e"],
        initial: "a",
        opens: {},
        transitions: [{ from: "a", to: "b", at: "entrance" }],
      }
    expect(5 ** 12).toBeGreaterThan(MAX_LOCK_STATES)
    expect(reachableStates(spec)).toBe("tooLarge")
  })

  it("offers the way back in only from the way out, never from a room in between", () => {
    // entrance → hall → vault, with vault the way out. A player standing in the hall has no staircase
    // to leave by, so their only way back to the entrance is the corridor they came along.
    const spec: LockSpec = {
      regions: ["entrance", "hall", "vault"],
      gates: {
        first: { from: "entrance", to: "hall", owners: ["open"] },
        second: { from: "hall", to: "vault", owners: ["open"] },
      },
      mechanisms: {
        open: { states: ["open"], initial: "open", opens: { open: ["first", "second"] }, transitions: [] },
      },
      in: "entrance",
      out: "vault",
    }
    const found = reachableStates(spec)
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    const edgesFrom = (region: string) =>
      found.edges[found.order.findIndex(state => state.region === region)].map(n => found.order[n].region)
    expect(edgesFrom("hall")).toEqual(["entrance", "vault"])
    expect(edgesFrom("vault")).toEqual(["hall", "entrance"])
  })
})

// The design doc's worked example. Y is a beam board in the entrance fork whose two ways out are both
// shut. The right way is open from the start and leads to S1; throwing S1 shuts it again and opens the
// left branch's lower gate. A drop from S1's chamber lands BETWEEN the fork's left gate and that newly
// opened one, so the player reaches S2, which opens the way out.
const doubleBack = (): LockSpec => ({
  regions: ["entrance", "rightLower", "s1Chamber", "leftLower", "s2Chamber", "wayOut"],
  gates: {
    forkLeft: { from: "entrance", to: "leftLower", owners: ["Y"] },
    forkRight: { from: "entrance", to: "rightLower", owners: ["Y"] },
    greenRight: { from: "rightLower", to: "s1Chamber", owners: ["S1"] },
    greenLeft: { from: "leftLower", to: "s2Chamber", owners: ["S1"] },
    endDoor: { from: "s2Chamber", to: "wayOut", owners: ["S2"] },
  },
  mechanisms: {
    Y: {
      states: ["unset", "left", "right"],
      initial: "unset",
      opens: { unset: [], left: ["forkLeft"], right: ["forkRight"] },
      transitions: [
        { from: "unset", to: "left", at: "entrance" },
        { from: "unset", to: "right", at: "entrance" },
        { from: "left", to: "right", at: "entrance" },
        { from: "right", to: "left", at: "entrance" },
      ],
    },
    S1: {
      states: ["start", "thrown"],
      initial: "start",
      opens: { start: ["greenRight"], thrown: ["greenLeft"] },
      transitions: [{ from: "start", to: "thrown", at: "s1Chamber" }],
    },
    S2: {
      states: ["start", "thrown"],
      initial: "start",
      opens: { start: [], thrown: ["endDoor"] },
      transitions: [{ from: "start", to: "thrown", at: "s2Chamber" }],
    },
  },
  oneWays: [{ from: "s1Chamber", to: "leftLower" }],
  in: "entrance",
  out: "wayOut",
})

describe("walkLock", () => {
  // The drop lands one gate lower, past the gate S1 opens, so taking it early costs nothing.
  const dropPastTheGreenGate = (): LockSpec => ({ ...doubleBack(), oneWays: [{ from: "s1Chamber", to: "s2Chamber" }] })

  it("strands the player who takes the drop before throwing S1", () => {
    // The worked example as the design doc writes it. Nothing stops a player walking into the drop on
    // the way in: they land between two shut gates, the lever that opens one of them is behind them,
    // and there is no staircase down there to leave by.
    const result = walkLock(doubleBack())
    if (result.sound) throw new Error("expected the early drop to strand")
    expect(result.failure).toEqual({
      type: "strands",
      at: { region: "leftLower", config: { Y: "right", S1: "start", S2: "start" } },
    })
  })

  it("is sound with the drop one gate lower", () => {
    expect(walkLock(dropPastTheGreenGate())).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("strands whoever turns left when the board cannot be re-solved", () => {
    // Y one-shot: set left and the right branch is gone for good, so S1 is never thrown, the left
    // branch's lower gate never opens, and the drop starts on the wrong side to help.
    const spec = dropPastTheGreenGate()
    spec.mechanisms.Y.transitions = spec.mechanisms.Y.transitions.filter(t => t.from === "unset")
    const result = walkLock(spec)
    if (result.sound) throw new Error("expected a one-shot fork to strand")
    expect(result.failure).toEqual({
      type: "strands",
      at: { region: "entrance", config: { Y: "left", S1: "start", S2: "start" } },
    })
  })

  it("calls a lock with no way through unsolvable rather than stranding", () => {
    const spec = oneDoor()
    // The key lies behind its own door.
    spec.mechanisms.key.transitions = [{ from: "absent", to: "held", at: "vault" }]
    expect(walkLock(spec)).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("fails a switch that can shut the way it was entered by, because the staircase is past it", () => {
    // One fork, one board, and the corridor the player arrived by among the ways out it can shut. The
    // way out is past the fork, so the player can reach it, come back in at the entrance, and find the
    // only door to the board shut.
    const spec: LockSpec = {
      regions: ["entrance", "fork", "wayOut"],
      gates: {
        back: { from: "entrance", to: "fork", owners: ["board"] },
        onward: { from: "fork", to: "wayOut", owners: ["board"] },
      },
      mechanisms: {
        board: {
          states: ["back", "onward"],
          initial: "back",
          opens: { back: ["back"], onward: ["onward"] },
          transitions: [
            { from: "back", to: "onward", at: "fork" },
            { from: "onward", to: "back", at: "fork" },
          ],
        },
      },
      in: "entrance",
      out: "wayOut",
    }
    const result = walkLock(spec)
    if (result.sound) throw new Error("expected the way back to strand")
    expect(result.failure).toEqual({ type: "strands", at: { region: "entrance", config: { board: "onward" } } })
  })

  it("names the state it died in, so an author can read the trap", () => {
    const result = walkLock(doubleBack())
    if (result.sound) throw new Error("expected the early drop to strand")
    const described = describeLockWalkFailure(result.failure)
    expect(described).toContain("leftLower")
    expect(described).toContain("Y at right")
  })

  it("says the lock is too large rather than walking it, and the message names the ceiling", () => {
    const spec = oneDoor()
    spec.mechanisms.key.states = Array.from({ length: MAX_LOCK_STATES }, (_, n) => `s${n}`)
    spec.mechanisms.key.initial = "s0"
    spec.mechanisms.key.opens = { s0: [] }
    spec.mechanisms.key.transitions = []
    const result = walkLock(spec)
    if (result.sound) throw new Error("expected the ceiling to stop the walk")
    expect(result.failure).toEqual({ type: "tooLarge" })
    expect(describeLockWalkFailure(result.failure)).toBe(`the lock names more than ${MAX_LOCK_STATES} states`)
  })

  it("reports a malformed lock without walking it", () => {
    const spec = oneDoor()
    spec.out = "valut"
    expect(walkLock(spec)).toEqual({ sound: false, failure: { type: "malformed", problem: expect.any(String) } })
  })
})
