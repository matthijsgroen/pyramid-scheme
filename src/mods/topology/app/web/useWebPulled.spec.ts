// @vitest-environment jsdom
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: <T>(_key: string, initialValue: T | (() => T)) => {
    const [state, setState] = useState(typeof initialValue === "function" ? (initialValue as () => T)() : initialValue)
    return [
      state,
      (value: T | ((prev: T) => T)) => {
        setState(value)
        return Promise.resolve(value)
      },
    ]
  },
}))

const { useWebPulled } = await import("./useWebPulled")

const ACTIVATORS = [
  { name: "sun", pots: ["w3"] },
  { name: "moon", pots: ["w3"] },
]

describe("the pulled set in the topology mod's state", () => {
  it("gives the pot's second stop once any two of its levers are pulled, a lever pulled twice counting once", async () => {
    const { result } = renderHook(() => useWebPulled(ACTIVATORS))
    await act(async () => result.current.pull("sun"))
    await act(async () => result.current.pull("sun"))
    expect(result.current.heldKeys.has("web:w3#2")).toBe(false)
    await act(async () => result.current.pull("moon"))
    expect([...result.current.heldKeys].sort()).toEqual(["web:moon", "web:sun", "web:w3#1", "web:w3#2"])
    expect(Object.keys(result.current.pulled).sort()).toEqual(["moon", "sun"])
  })
})
