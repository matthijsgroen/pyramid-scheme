// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CORE_SOUNDS } from "@/app/audio/coreSounds"
import { useGateOpensSound } from "./useGateOpensSound"

const playSound = vi.hoisted(() => vi.fn())
vi.mock("@/app/audio/audio", () => ({ playSound }))

const render = (open: string[], floor = "site:0") =>
  renderHook(({ open, floor }) => useGateOpensSound(new Set(open), floor), { initialProps: { open, floor } })

beforeEach(() => playSound.mockClear())

describe("a door opening on the floor", () => {
  it("sounds once when a gate opens, and not on mount", () => {
    const { rerender } = render(["a"])
    expect(playSound).not.toHaveBeenCalled()
    rerender({ open: ["a", "b"], floor: "site:0" })
    rerender({ open: ["a", "b"], floor: "site:0" })
    expect(playSound.mock.calls.map(([name]) => name)).toEqual([CORE_SOUNDS.corridorOpens])
  })

  it("stays quiet when a gate shuts", () => {
    const { rerender } = render(["a", "b"])
    rerender({ open: ["a"], floor: "site:0" })
    expect(playSound).not.toHaveBeenCalled()
  })

  it("stays quiet on a floor change", () => {
    const { rerender } = render([])
    rerender({ open: ["c"], floor: "site:1" })
    expect(playSound).not.toHaveBeenCalled()
  })
})
