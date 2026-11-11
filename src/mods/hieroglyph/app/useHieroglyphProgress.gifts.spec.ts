// @vitest-environment jsdom
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { GIVEN_SIGNS } from "@/mods/hieroglyph/game/hieroglyphData"

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

const { useHieroglyphProgress } = await import("./useHieroglyphProgress")

describe("a sign a ghost gives", () => {
  it.each(Object.keys(GIVEN_SIGNS))("is complete with its one piece (%s)", async id => {
    const { result } = renderHook(() => useHieroglyphProgress())
    expect(result.current.completedHieroglyphKeys.has(`hieroglyph:${id}`)).toBe(false)

    await act(async () => result.current.addFragment(id, 0))

    expect(result.current.hieroglyphProgress(id)).toEqual({ found: 1, required: 1 })
    expect(result.current.completedHieroglyphKeys.has(`hieroglyph:${id}`)).toBe(true)
  })
})
