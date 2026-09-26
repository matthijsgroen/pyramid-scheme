import { describe, expect, it } from "vitest"
import { checkLockSpec, openGates, reachableStates, MAX_LOCK_STATES, type LockSpec } from "./lockWalk"

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
