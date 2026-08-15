import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useFoundCorridors } from "./useFoundCorridors"

// Mirrors the real API: a fresh Set on every call, which is exactly what the hook has to absorb.
const journeysWith = (found: string[]): JourneyAPI =>
  ({ getFoundHiddenCorridors: () => new Set(found) }) as unknown as JourneyAPI

describe("useFoundCorridors", () => {
  it("keeps the same set identity across renders, so the masked grid isn't rebuilt every render", () => {
    const { result, rerender } = renderHook(() => useFoundCorridors(journeysWith(["a", "b"]), "j1"))
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })

  it("ignores the order corridors were found in — same contents, same set", () => {
    const { result, rerender } = renderHook(({ found }) => useFoundCorridors(journeysWith(found), "j1"), {
      initialProps: { found: ["b", "a"] },
    })
    const first = result.current

    rerender({ found: ["a", "b"] })

    expect(result.current).toBe(first)
  })

  it("hands back a new set once a corridor is found, so the reveal reaches the grid", () => {
    const { result, rerender } = renderHook(({ found }) => useFoundCorridors(journeysWith(found), "j1"), {
      initialProps: { found: ["a"] },
    })

    rerender({ found: ["a", "b"] })

    expect([...result.current].sort()).toEqual(["a", "b"])
  })

  it("is empty when nothing has been found, rather than holding a stray blank hash", () => {
    const { result } = renderHook(() => useFoundCorridors(journeysWith([]), "j1"))

    expect(result.current.size).toBe(0)
  })
})
