// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { registerDevGrants, registerDevJumps } from "./devActionContributions"
import { useDevActions } from "./useDevActions"

const grant = vi.fn()
const jump = vi.fn(() => Promise.resolve())
const preview = vi.fn()
registerDevGrants(() => [
  { label: "A grant", grant },
  { label: "A preview", grant: preview, inUnlockEverything: false },
])
registerDevJumps(() => [{ label: "A jump", jump }])

describe("dev menu jumps", () => {
  it("opens the expedition once the jump has placed the explorer", async () => {
    const onJumped = vi.fn()
    const { result } = renderHook(() => useDevActions(onJumped))

    await act(async () => result.current.find(a => a.label === "A jump")?.onClick())

    expect(jump).toHaveBeenCalledOnce()
    expect(onJumped).toHaveBeenCalledOnce()
  })

  it("is never run by Unlock everything", () => {
    jump.mockClear()
    const { result } = renderHook(() => useDevActions())

    result.current.find(a => a.label === "Unlock everything")?.onClick()

    expect(grant).toHaveBeenCalled()
    expect(preview).not.toHaveBeenCalled()
    expect(jump).not.toHaveBeenCalled()
  })
})
