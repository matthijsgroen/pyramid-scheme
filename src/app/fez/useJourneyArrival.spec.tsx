// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FezContext, type FezConversationResult } from "./context"
import { useJourneyArrival } from "./useJourneyArrival"

type Call = { id: string; options?: { story?: boolean } }

/** A companion that plays what it is given, or reports straight back when `plays` says it would not. */
const arrival = (plays = true) => {
  const calls: Call[] = []
  const showConversation = vi.fn(
    (id: string, onComplete?: (r: FezConversationResult) => void, options?: { story?: boolean }) => {
      calls.push({ id, options })
      onComplete?.(plays ? "complete" : "seen-earlier")
    }
  )
  const { result } = renderHook(() => useJourneyArrival(), {
    wrapper: ({ children }) => (
      <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>
        {children}
      </FezContext>
    ),
  })
  return { setOff: result.current, calls }
}

describe("setting off on a journey", () => {
  it("plays the journey's own beat before travelling, with the map still behind it", () => {
    const { setOff, calls } = arrival()
    const travel = vi.fn()

    setOff("starter_1", travel)

    expect(calls[0].id).toBe("arrival.starter_1")
    expect(travel).toHaveBeenCalledOnce()
  })

  it("marks it story, so turning tutorials off does not silence the plot", () => {
    const { setOff, calls } = arrival()

    setOff("junior_3", vi.fn())

    expect(calls[0].options).toEqual({ story: true })
  })

  it("travels anyway when the beat has been heard before", () => {
    const { setOff } = arrival(false)
    const travel = vi.fn()

    setOff("starter_1", travel)

    expect(travel).toHaveBeenCalledOnce()
  })

  it("does not hold up a journey that has no beat of its own", () => {
    const { setOff, calls } = arrival()
    const travel = vi.fn()

    setOff("nothing_written_here", travel)

    // Never offers `pyramidIntro` here: that one is the board's, and the board is a screen away.
    expect(calls).toEqual([])
    expect(travel).toHaveBeenCalledOnce()
  })
})
