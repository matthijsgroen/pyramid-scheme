// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { AudioService } from "./audioService"

let stored: Record<string, unknown> = {}
vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: (key: string, initialValue: unknown) => [key in stored ? stored[key] : initialValue, vi.fn(), true],
}))

const { useAudioSettings } = await import("./audioSettings")

const fakeService = (): AudioService => ({
  play: vi.fn(),
  unlock: vi.fn(),
  setEffects: vi.fn(),
  setMusic: vi.fn(),
  duck: vi.fn(() => () => {}),
})

describe("useAudioSettings", () => {
  it("hands sound effects on and music off to the service when nothing is stored", () => {
    stored = {}
    const service = fakeService()
    renderHook(() => useAudioSettings(service))
    expect(service.setEffects).toHaveBeenLastCalledWith(true)
    expect(service.setMusic).toHaveBeenLastCalledWith(false)
  })

  it("hands a stored switch change to the service", () => {
    stored = {}
    const service = fakeService()
    const { rerender } = renderHook(() => useAudioSettings(service))
    stored = { soundEffects: false, music: true }
    rerender()
    expect(service.setEffects).toHaveBeenLastCalledWith(false)
    expect(service.setMusic).toHaveBeenLastCalledWith(true)
  })

  it("a tap on the page unlocks the service", () => {
    stored = {}
    const service = fakeService()
    renderHook(() => useAudioSettings(service))
    window.dispatchEvent(new Event("pointerdown"))
    expect(service.unlock).toHaveBeenCalledTimes(1)
  })
})
