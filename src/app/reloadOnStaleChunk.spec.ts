// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { reloadOnStaleChunk } from "./reloadOnStaleChunk"

const fakeWindow = () => {
  const target = new EventTarget() as unknown as Window
  const store = new Map<string, string>()
  const reload = vi.fn()
  Object.assign(target, {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
    location: { reload },
  })
  return { target, reload }
}

describe("reloadOnStaleChunk", () => {
  let clock = 1_000_000
  beforeEach(() => {
    clock = 1_000_000
  })

  it("reloads once into the new build when a chunk is gone, and leaves a second failure to the crash screen", () => {
    const { target, reload } = fakeWindow()
    reloadOnStaleChunk(target, () => clock)
    target.dispatchEvent(new Event("vite:preloadError", { cancelable: true }))
    expect(reload).toHaveBeenCalledTimes(1)
    clock += 2_000
    target.dispatchEvent(new Event("vite:preloadError", { cancelable: true }))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
