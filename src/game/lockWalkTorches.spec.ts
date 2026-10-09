import { describe, expect, it } from "vitest"
import { checkLockSpec, reachableStates, walkLock } from "./lockWalk"
import { walkSpecOf } from "./lockWalkSpec"
import { parseLock } from "./lockNotation"

const specOf = (text: string) => walkSpecOf(parseLock(text, "flood").lock)

// B burns and A does not; the door wants the opposite. Flooding the hall puts B out.
const TWO_TORCHES = `
in -- hub -- hall
hub -[A+B:off]- out
hall -[S:a]
S toggle @hub
B torch @hall lit
A torch @hall
`

describe("the lock walk with torches and a flood", () => {
  it("proves the two-torch lock: flood the hall, let the water go, light A", () => {
    expect(walkLock(specOf(TWO_TORCHES)).sound).toBe(true)
  })

  it("finds no way out when no flood can put the lit torch out", () => {
    const walked = walkLock(specOf("in -- hub -- hall\nhub -[A+B:off]- out\nB torch @hall lit\nA torch @hall"))
    expect(walked).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("starts a lit torch out when its region is covered at the start", () => {
    const found = reachableStates(
      specOf("in -- hub -- hall\nhub -[B]- out\nhall -[S:b]\nS toggle @hub\nB torch @hall lit")
    )
    expect(found !== "tooLarge" && found.order[0].config.B).toBe("off")
  })

  it("lights a doused torch again once its region is uncovered", () => {
    const found = reachableStates(specOf(TWO_TORCHES))
    expect(
      found !== "tooLarge" && found.order.some(s => s.config.S === "a" && s.config.B === "on" && s.config.A === "on")
    ).toBe(true)
    expect(
      found !== "tooLarge" && found.order.some(s => s.config.S === "b" && (s.config.A === "on" || s.config.B === "on"))
    ).toBe(false)
  })

  it("never puts out an activator under the water", () => {
    const found = reachableStates(
      specOf("in -- hub -- hall\nhub -[K]- out\nhall -[S:a]\nS toggle @hub\nK activator @hall")
    )
    expect(found !== "tooLarge" && found.order.some(s => s.config.S === "b" && s.config.K === "on")).toBe(true)
  })

  it("lists each torch with the entry hops of the region gates over its region", () => {
    const spec = specOf(TWO_TORCHES)
    expect(spec.torches?.map(t => t.mechanism).sort()).toEqual(["A", "B"])
    for (const { coveredBy } of spec.torches ?? []) {
      expect(coveredBy.length).toBeGreaterThan(0)
      for (const gate of coveredBy) expect(spec.gates[gate]).toBeDefined()
    }
  })

  it("refuses a torch the spec cannot resolve", () => {
    const spec = specOf(TWO_TORCHES)
    expect(checkLockSpec({ ...spec, torches: [{ mechanism: "Z", coveredBy: [] }] })).toBe(
      "a torch names no mechanism: Z"
    )
    expect(checkLockSpec({ ...spec, torches: [{ mechanism: "S", coveredBy: [] }] })).toBe(
      "torch S has no states off and on"
    )
    expect(checkLockSpec({ ...spec, torches: [{ mechanism: "A", coveredBy: ["nowhere"] }] })).toBe(
      "torch A is covered by no such gate: nowhere"
    )
  })
})
