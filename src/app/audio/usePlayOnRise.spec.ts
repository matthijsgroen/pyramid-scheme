// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { usePlayOnRise } from "./usePlayOnRise"

const mount = (active: boolean) => {
  const play = vi.fn()
  const hook = renderHook(({ on }) => usePlayOnRise(on, "test.settle", play), { initialProps: { on: active } })
  return { play, rerender: (on: boolean) => hook.rerender({ on }) }
}

describe("usePlayOnRise", () => {
  it("mounting already active plays nothing", () => {
    const { play } = mount(true)
    expect(play).toHaveBeenCalledTimes(0)
  })

  it("turning active plays once, and staying active plays no more", () => {
    const { play, rerender } = mount(false)
    rerender(true)
    rerender(true)
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith("test.settle")
  })

  it("turning active again after a fall plays again", () => {
    const { play, rerender } = mount(false)
    rerender(true)
    rerender(false)
    rerender(true)
    expect(play).toHaveBeenCalledTimes(2)
  })
})
