import { describe, expect, it } from "vitest"
import type { Lock } from "./lockAuthoring"
import { lastDoorsOf, solvedLocks } from "./lockSolved"

// in -[A]- hall -[B]- out, and a region gate C on a side nook.
const corridor: Lock = {
  name: "corridor",
  regions: {},
  connections: [],
  gates: {
    A: { from: "in", to: "hall", owners: ["lever"] },
    B: { from: "hall", to: "out", owners: ["lever"] },
    C: { region: "nook", owners: ["lever"] },
  },
  mechanics: {},
  in: "in",
  out: "out",
}

// Two ways into its way out: a door from the hall, and the whole out region barred.
const twoWays: Lock = {
  ...corridor,
  name: "twoWays",
  gates: {
    D: { from: "out", to: "hall", owners: ["lever"] },
    E: { region: "out", owners: ["lever"] },
  },
}

const noWayOut: Lock = { ...corridor, name: "noWayOut", gates: { A: corridor.gates.A } }

const openOnly =
  (...ids: string[]) =>
  (id: string) =>
    ids.includes(id)

describe("lastDoorsOf", () => {
  it("names the gates into the lock's way out, under the lock's instance", () => {
    expect(lastDoorsOf({ lock: corridor })).toEqual(["corridor.B"])
    expect(lastDoorsOf({ lock: twoWays })).toEqual(["twoWays.D", "twoWays.E"])
  })
})

describe("solvedLocks", () => {
  it("a lock whose door into its way out is shut is not solved", () => {
    expect(solvedLocks([{ lock: corridor }], openOnly())).toEqual(new Set())
  })

  it("a lock is solved once any door into its way out stands open", () => {
    expect(solvedLocks([{ lock: corridor }], openOnly("corridor.B"))).toEqual(new Set(["corridor"]))
    expect(solvedLocks([{ lock: twoWays }], openOnly("twoWays.E"))).toEqual(new Set(["twoWays"]))
  })

  it("names a lock placed with as by that name, not by the lock's", () => {
    expect(solvedLocks([{ lock: corridor, as: "second" }], openOnly("second.B"))).toEqual(new Set(["second"]))
    expect(solvedLocks([{ lock: corridor, as: "second" }], openOnly("corridor.B"))).toEqual(new Set())
  })

  it("a lock with no door into its way out is never solved", () => {
    expect(solvedLocks([{ lock: noWayOut }], () => true)).toEqual(new Set())
  })

  it("an open door elsewhere in the lock does not solve it", () => {
    expect(solvedLocks([{ lock: corridor }], openOnly("corridor.A", "corridor.C"))).toEqual(new Set())
  })
})
