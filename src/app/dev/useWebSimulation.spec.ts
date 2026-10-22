// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { useWebSimulation } from "./useWebSimulation"
import { inThreadEngine } from "./webEngine"
import { madeUpTier, madeUpWebHost } from "./madeUpWeb"

const WEB = "[w1p1]\nsand by a\n[w2p1]\nlever a @end\n[w1p2]\nkey b @end\n[w2p2]\nb opens 50%"
const engineOf = () => inThreadEngine(madeUpWebHost(madeUpTier([2, 2])))

describe("useWebSimulation", () => {
  it("checks the text once it rests, and a pull plays through on that check", async () => {
    const engine = engineOf()
    const check = vi.spyOn(engine, "check")
    const { result } = renderHook(() => useWebSimulation(engine, WEB, "made.web"))
    expect(result.current.checking).toBe(true)
    await waitFor(() => expect(result.current.view?.reachable).toEqual(["a"]))
    expect(result.current.checking).toBe(false)
    expect(check).toHaveBeenCalledTimes(1)

    act(() => result.current.pull("a"))
    await waitFor(() => expect(result.current.state?.pulled).toEqual(["a"]))
    expect(result.current.view?.reachable).toEqual(["b"])

    act(() => result.current.reset())
    await waitFor(() => expect(result.current.state?.pulled).toEqual([]))
  })

  it("checks only the last of several quick edits", async () => {
    const engine = engineOf()
    const check = vi.spyOn(engine, "check")
    const { result, rerender } = renderHook(({ text }) => useWebSimulation(engine, text, "made.web"), {
      initialProps: { text: "[w1p1]" },
    })
    rerender({ text: "[w1p1]\n" })
    rerender({ text: WEB })
    await waitFor(() => expect(result.current.checking).toBe(false))
    expect(check).toHaveBeenCalledTimes(1)
    expect(check).toHaveBeenCalledWith(WEB, "made.web")
  })
})
