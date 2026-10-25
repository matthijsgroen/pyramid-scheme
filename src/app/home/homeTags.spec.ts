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
    registerHomeTags(() => ["rested", "lamp"])
    registerHomeTags(() => ["lamp", "rain"])

    const { result } = renderHook(() => useHomeTags())

    expect(result.current).toEqual(["rested", "lamp", "rain"])
  })

  it("is empty when nothing is registered", async () => {
    const { useHomeTags } = await load()

    expect(renderHook(() => useHomeTags()).result.current).toEqual([])
  })
})
