// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import type { Gate } from "./allJourneys"
import { registerGateNeeds, useMergedGateNeeds } from "./gateNeeds"

const gate = { tier: "expert" } as const
const readA = (g: Gate) => ("tier" in g ? [{ key: "a", label: "A", hint: "here" }] : [])
const readB = (g: Gate) => ("tier" in g ? [{ key: "b", label: "B" }] : [{ key: "c", label: "C" }])

describe(useMergedGateNeeds, () => {
  it("opens every gate while no hook is registered", () => {
    const { result } = renderHook(() => useMergedGateNeeds())
    expect(result.current.needs(gate)).toEqual([])
    expect(result.current.open(gate, new Set())).toBe(true)
  })

  it("concatenates what every registered hook asks, and holds a gate shut until each key is held", () => {
    registerGateNeeds(() => readA)
    registerGateNeeds(() => readB)
    const { result } = renderHook(() => useMergedGateNeeds())
    const { needs, unmet, open } = result.current
    expect(needs(gate).map(n => n.key)).toEqual(["a", "b"])
    expect(needs({ journeyId: "x" }).map(n => n.key)).toEqual(["c"])
    expect(unmet(gate, new Set(["a"])).map(n => n.key)).toEqual(["b"])
    expect(open(gate, new Set(["a"]))).toBe(false)
    expect(open(gate, new Set(["a", "b"]))).toBe(true)
    expect(open({ journeyId: "x" }, new Set(["a", "b"]))).toBe(false)
  })
})

describe("useMergedGateNeeds stability", () => {
  it("returns the same object across renders while the readers stay the same", () => {
    const reader = () => []
    registerGateNeeds(() => reader)
    const { result, rerender } = renderHook(() => useMergedGateNeeds())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
