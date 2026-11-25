// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { resumeAudioOnGesture } from "./audio"
import type { AudioService } from "./audioService"

const fakeService = (): AudioService => ({
  play: vi.fn(),
  loop: vi.fn(() => () => {}),
  unlock: vi.fn(),
  setEffects: vi.fn(),
  setMusic: vi.fn(),
  duck: vi.fn(() => () => {}),
  diagnose: vi.fn(),
})

describe("resumeAudioOnGesture", () => {
  it("a pointerdown on the page unlocks the service", () => {
    const service = fakeService()
    const cleanup = resumeAudioOnGesture(window, service)
    window.dispatchEvent(new Event("pointerdown"))
    expect(service.unlock).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it("stops listening after cleanup", () => {
    const service = fakeService()
    resumeAudioOnGesture(window, service)()
    window.dispatchEvent(new Event("pointerdown"))
    window.dispatchEvent(new Event("keydown"))
    expect(service.unlock).toHaveBeenCalledTimes(0)
  })
})
