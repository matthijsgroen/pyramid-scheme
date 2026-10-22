// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, render } from "@testing-library/react"
import { useCallback, useState, type SetStateAction } from "react"

const store: Record<string, unknown> = {}

vi.mock("@/support/useGameStorage", () => ({
  latestGameValue: (key: string) => store[key],
  primeGameValue: async (key: string) => store[key],
  useGameStorage: <T,>(key: string, initial: T) => {
    const [value, setValue] = useState<T>((store[key] as T) ?? initial)
    const set = useCallback(
      async (next: SetStateAction<T>) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)((store[key] as T) ?? initial) : next
        store[key] = resolved
        setValue(resolved)
        return resolved
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [key]
    )
    return [value, set, true]
  },
}))

const { FezContext } = await import("@/app/fez/context")
const { useMosaicReminder } = await import("./useMosaicReminder")

type Fez = { met?: boolean; speaking?: boolean; introHeard?: boolean }

const Screen = ({ unplaced }: { unplaced: number }) => {
  useMosaicReminder({ unplaced, ready: true })
  return null
}

/** Returns to the travel screen `times` times, each one a fresh mount as it is in the game. */
const returnTimes = async (
  times: number,
  unplaced: number,
  { met = true, speaking = false, introHeard = true }: Fez = {}
) => {
  const asked: string[] = []
  const showConversation = vi.fn((id: string, done?: (result: "complete" | "seen-earlier") => void) => {
    const heard = id === "mosaicIntro" && introHeard
    if (!heard) asked.push(id)
    done?.(heard ? "seen-earlier" : "complete")
  })
  for (let i = 0; i < times; i++) {
    const { unmount } = render(
      <FezContext value={{ showConversation, met, speaking }}>
        <Screen unplaced={unplaced} />
      </FezContext>
    )
    await act(async () => {})
    unmount()
  }
  return { asked, showConversation }
}

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
})

describe("Fez's reminder to set the mosaic pieces in", () => {
  it("comes on the third return to the travel screen with pieces in hand, replayed though heard before", async () => {
    const { asked, showConversation } = await returnTimes(3, 2)

    expect(asked).toEqual(["mosaicReminder"])
    expect(showConversation).toHaveBeenCalledWith("mosaicReminder", undefined, { forceReplay: true })
  })

  it("does not come on the returns before it", async () => {
    expect((await returnTimes(2, 2)).asked).toEqual([])
  })

  it("never comes with no pieces waiting", async () => {
    expect((await returnTimes(6, 0)).asked).toEqual([])
  })

  it("waits while somebody else is talking", async () => {
    expect((await returnTimes(3, 1, { speaking: true })).asked).toEqual([])
    expect((await returnTimes(1, 1)).asked).toEqual(["mosaicReminder"])
  })

  it("waits until Fez is met", async () => {
    expect((await returnTimes(3, 1, { met: false })).asked).toEqual([])
    expect((await returnTimes(1, 1)).asked).toEqual(["mosaicReminder"])
  })

  it("stays quiet with tutorials turned off", async () => {
    store.tutorialsEnabled = false
    expect((await returnTimes(6, 1)).asked).toEqual([])
  })

  it("gives the explanation instead when the player has pieces and never heard it", async () => {
    // The first find plays it, unless Fez was not met yet; then the travel screen gives it.
    expect((await returnTimes(1, 1, { introHeard: false })).asked).toEqual(["mosaicIntro"])
  })
})
