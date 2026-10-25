// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const load = async () => {
  vi.resetModules()
  return import("./homeTags")
}

describe("home tags", () => {
  it("merges every registered hook's tags in registration order, dropping duplicates", async () => {
    const { registerHomeTags, useHomeTags } = await load()
    registerHomeTags(() => ({ tags: ["rested", "lamp"], loaded: true }))
    registerHomeTags(() => ({ tags: ["lamp", "rain"], loaded: true }))

    const { result } = renderHook(() => useHomeTags())

    expect(result.current).toEqual({ tags: ["rested", "lamp", "rain"], loaded: true })
  })

  it("is empty and loaded when nothing is registered", async () => {
    const { useHomeTags } = await load()

    expect(renderHook(() => useHomeTags()).result.current).toEqual({ tags: [], loaded: true })
  })

  it("is not loaded until every source has read its save", async () => {
    const { registerHomeTags, useHomeTags } = await load()
    let second = false
    registerHomeTags(() => ({ tags: [], loaded: true }))
    registerHomeTags(() => ({ tags: [], loaded: second }))

    const { result, rerender } = renderHook(() => useHomeTags())
    expect(result.current.loaded).toBe(false)
    second = true
    rerender()
    expect(result.current.loaded).toBe(true)
  })
})
