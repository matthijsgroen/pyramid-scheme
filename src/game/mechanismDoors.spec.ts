import { describe, expect, it } from "vitest"
import { openDoorsFor, throwMechanism } from "./mechanismDoors"
import { MECHANISM_AT_REST, type MechanismRecord } from "@/game/siteTypes"
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

  // doubleBack's S1: authored states are its own, never "left"/"right" — the same rule has to land on
  // them without a control-only exception.
  const control: MechanismRecord = {
    states: ["start", "thrown"],
    initial: "start",
    returnsToInitial: false,
    positions: [],
  }

  it("flips a control's own two states the same way", () => {
    expect(throwMechanism(control, "start")).toBe("thrown")
    expect(throwMechanism(control, "thrown")).toBe("start")
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
