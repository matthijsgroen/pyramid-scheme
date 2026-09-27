import { describe, expect, it } from "vitest"
import { openDoorsFor } from "./mechanismDoors"
import { MECHANISM_AT_REST } from "@/app/state/useJourneys"
import { gridWithMechanism } from "./testSupport/mechanismFixtures"

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
