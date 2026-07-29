import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useOfflineStorage } from "./useOfflineStorage"

// Regression for the journey-progress wipe bug: a component that mounts a fresh
// useOfflineStorage instance (e.g. SiteMapScreen re-mounting a useJourneys() call on every
// pyramid/tomb entry) must not clobber data another instance already persisted, even if it
// writes before its own initial read of the key has resolved.
describe("useOfflineStorage — concurrent instances", () => {
  it("a write from a freshly-mounted instance is applied on top of already-persisted data, not the pre-load default", async () => {
    const storeName = `race-test-${Math.random()}`
    const key = "items"

    const owner = renderHook(() => useOfflineStorage<string[]>(key, [], storeName))
    await act(async () => {
      await owner.result.current[1](["a", "b", "c"])
    })

    // Mount a second instance sharing the same persisted key — its local state starts at the
    // default `[]` and its own load promise hasn't resolved yet at this point.
    const fresh = renderHook(() => useOfflineStorage<string[]>(key, [], storeName))
    let writePromise!: Promise<string[]>
    act(() => {
      writePromise = fresh.result.current[1](prev => [...prev, "d"])
    })
    await act(async () => {
      await writePromise
    })

    expect(fresh.result.current[0]).toEqual(["a", "b", "c", "d"])

    // The persisted store itself must reflect the merge, not just this instance's local state.
    const verify = renderHook(() => useOfflineStorage<string[]>(key, [], storeName))
    await act(async () => {
      await Promise.resolve()
    })
    expect(verify.result.current[0]).toEqual(["a", "b", "c", "d"])
  })
})
