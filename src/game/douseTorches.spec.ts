import { describe, expect, it, vi } from "vitest"
import { douseTorches } from "./mechanismDoors"

// The hall is covered while the lever S stands at b.
const hallCovered = (inHall: string[]) => (states: ReadonlyMap<string, string>) =>
  new Set(states.get("S") === "b" ? inHall : [])

describe("douseTorches", () => {
  it("puts out a lit torch whose region is covered", () => {
    const states = new Map([
      ["S", "b"],
      ["T", "on"],
    ])
    expect(douseTorches(states, ["T"], hallCovered(["T"])).get("T")).toBe("off")
  })

  it("leaves an unlit torch, an uncovered torch and anything that is no torch as they are", () => {
    const states = new Map([
      ["S", "b"],
      ["T", "off"],
      ["U", "on"],
      ["K", "on"],
    ])
    const covered = (s: ReadonlyMap<string, string>) => new Set(s.get("S") === "b" ? ["T", "K"] : [])
    expect(Object.fromEntries(douseTorches(states, ["T", "U"], covered))).toEqual({
      S: "b",
      T: "off",
      U: "on",
      K: "on",
    })
  })

  it("settles a chain: a torch whose dousing covers another torch's region puts that one out too", () => {
    const covered = vi.fn((s: ReadonlyMap<string, string>) => {
      const hit = new Set<string>()
      if (s.get("S") === "b") hit.add("A")
      if (s.get("A") === "off") hit.add("B")
      return hit
    })
    const states = new Map([
      ["S", "b"],
      ["A", "on"],
      ["B", "on"],
    ])
    expect(Object.fromEntries(douseTorches(states, ["A", "B"], covered))).toEqual({ S: "b", A: "off", B: "off" })
    expect(covered).toHaveBeenCalledTimes(3)
  })

  it("changes nothing on a second call, asking once", () => {
    const covered = vi.fn(hallCovered(["T"]))
    const once = douseTorches(
      new Map([
        ["S", "b"],
        ["T", "on"],
      ]),
      ["T"],
      covered
    )
    covered.mockClear()
    expect(douseTorches(once, ["T"], covered)).toEqual(once)
    expect(covered).toHaveBeenCalledTimes(1)
  })

  it("never lights a torch, and never touches the states it was handed", () => {
    expect(
      douseTorches(
        new Map([
          ["S", "a"],
          ["T", "off"],
        ]),
        ["T"],
        () => new Set(["T"])
      ).get("T")
    ).toBe("off")
    const handed = new Map([
      ["S", "b"],
      ["T", "on"],
    ])
    douseTorches(handed, ["T"], hallCovered(["T"]))
    expect(handed.get("T")).toBe("on")
  })
})
