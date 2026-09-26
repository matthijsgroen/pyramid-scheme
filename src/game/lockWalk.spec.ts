import { describe, expect, it } from "vitest"
import { checkLockSpec, openGates, type LockSpec } from "./lockWalk"

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
})
