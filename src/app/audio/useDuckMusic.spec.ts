// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { AudioService } from "./audioService"
import { useDuckMusic } from "./useDuckMusic"

const fakeService = () => {
  const release = vi.fn()
  const service: AudioService = {
    play: vi.fn(),
    loop: vi.fn(() => () => {}),
    unlock: vi.fn(),
    setEffects: vi.fn(),
    setMusic: vi.fn(),
    duck: vi.fn(() => release),
    diagnose: vi.fn(),
  }
  return { service, release }
}

describe("useDuckMusic", () => {
  it("ducks while active and releases when it turns inactive", () => {
    const { service, release } = fakeService()
    const { rerender } = renderHook(({ active }) => useDuckMusic(active, undefined, service), {
      initialProps: { active: true },
    })
    expect(service.duck).toHaveBeenCalledTimes(1)
    rerender({ active: true })
    expect(service.duck).toHaveBeenCalledTimes(1)
    rerender({ active: false })
    expect(release).toHaveBeenCalledTimes(1)
  })

  it("releases on unmount", () => {
    const { service, release } = fakeService()
    const { unmount } = renderHook(() => useDuckMusic(true, undefined, service))
    unmount()
    expect(release).toHaveBeenCalledTimes(1)
  })

  it("never ducks while inactive", () => {
    const { service } = fakeService()
    const { rerender } = renderHook(({ active }) => useDuckMusic(active, undefined, service), {
      initialProps: { active: false },
    })
    rerender({ active: false })
    expect(service.duck).not.toHaveBeenCalled()
  })
})
