// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useState, type SetStateAction } from "react"

const store: { loaded: boolean; saved: Record<string, boolean> } = { loaded: true, saved: {} }

vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: <T>(_key: string, initial: T) => {
    const [value, setValue] = useState<T>((store.saved as T) ?? initial)
    const set = async (next: SetStateAction<T>) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(value) : next
      store.saved = resolved as Record<string, boolean>
      setValue(resolved)
      return resolved
    }
    return [value, set, store.loaded]
  },
}))

const { useTapHint } = await import("./useTapHint")

describe("useTapHint", () => {
  it("shows until the target is tapped, then stays gone across a remount", () => {
    store.saved = {}
    const first = renderHook(() => useTapHint("targetA"))
    expect(first.result.current[0]).toBe(true)

    act(() => first.result.current[1]())
    expect(first.result.current[0]).toBe(false)

    const later = renderHook(() => useTapHint("targetA"))
    expect(later.result.current[0]).toBe(false)
  })

  it("retires only the target that was tapped", () => {
    store.saved = { targetA: true }
    const { result } = renderHook(() => useTapHint("targetB"))
    expect(result.current[0]).toBe(true)
  })

  it("stays hidden while the save is still loading", () => {
    store.saved = {}
    store.loaded = false
    const { result } = renderHook(() => useTapHint("targetA"))
    expect(result.current[0]).toBe(false)
    store.loaded = true
  })
})
