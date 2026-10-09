import { describe, expect, it } from "vitest"
import type { Lock } from "../lockAuthoring"
import { checkLock, compileLock } from "../lockCompile"
import { parseLock } from "../lockNotation"
import { controlKindOf, type StatefulControl } from "../obstacles"
import { resolveMechanicKind } from "./index"

const LIT = parseLock("in -[T]- out\nT torch @in lit").lock

describe("the flame kind, the torch line's", () => {
  it("compiles a torch into a stateful control that names its kind, flame", () => {
    const result = compileLock(LIT, { flame: "torch" })
    expect(result.ok && result.fragment.controls).toEqual([
      {
        id: "T",
        control: "flame",
        in: "in",
        states: ["off", "on"],
        initial: "on",
        returnsToInitial: false,
        opens: { off: [], on: ["in-out"] },
        encounter: "torch",
      },
    ])
  })

  it("is refused unbound, by its own binding key", () => {
    const result = compileLock(LIT, { activator: "torch" })
    expect(result.ok ? [] : result.faults).toContainEqual({ type: "unboundRole", kind: "flame", mechanics: ["T"] })
  })

  it("refuses a torch whose states are not off and on, or whose start is neither", () => {
    const named: Lock = {
      ...LIT,
      mechanics: { T: { control: "flame", in: "in", starts: "lit" as "on", opens: { unlit: [], lit: ["in-out"] } } },
    }
    expect(checkLock(named)).toContainEqual({
      type: "flameStates",
      mechanic: "T",
      states: ["unlit", "lit"],
      starts: "lit",
    })
  })

  it("is the kind its floor control answers to, seated in its region", () => {
    const control: StatefulControl = {
      id: "T",
      control: "flame",
      in: "hall",
      states: ["off", "on"],
      initial: "off",
      returnsToInitial: false,
      opens: { off: [], on: [] },
    }
    expect(controlKindOf(control)).toBe("flame")
    expect(resolveMechanicKind("flame")?.seats?.(control)).toEqual([{ region: "hall", seat: "control" }])
    expect(resolveMechanicKind("activator")?.seats?.(control)).toEqual([])
  })
})
