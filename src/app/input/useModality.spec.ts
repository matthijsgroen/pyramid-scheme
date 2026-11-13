// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { useModality } from "./useModality"

const root = document.documentElement
afterEach(() => {
  delete root.dataset.input
  delete root.dataset.pad
})

describe(useModality, () => {
  it("is touch and Xbox while <html> says nothing", () => {
    const { result } = renderHook(() => useModality())
    expect(result.current).toEqual({ input: "touch", brand: "xbox" })
  })

  it("follows <html data-input> and <html data-pad> as they change", async () => {
    const { result } = renderHook(() => useModality())
    act(() => {
      root.dataset.input = "pad"
      root.dataset.pad = "playstation"
    })
    await waitFor(() => expect(result.current).toEqual({ input: "pad", brand: "playstation" }))
    act(() => {
      root.dataset.input = "keys"
    })
    await waitFor(() => expect(result.current.input).toBe("keys"))
  })

  it("reads a brand it does not know as Xbox", () => {
    root.dataset.pad = "made-up"
    const { result } = renderHook(() => useModality())
    expect(result.current.brand).toBe("xbox")
  })
})
