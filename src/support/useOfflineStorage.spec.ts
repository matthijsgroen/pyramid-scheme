import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import localForage from "localforage"
import { useOfflineStorage } from "./useOfflineStorage"

// The hook builds one localForage instance per store name, lazily. Intercepting that first
// construction for an unused store name gives a real backing store with a counted `getItem`.
const countReadsFor = (storeName: string) => {
  const backing = localForage.createInstance({ name: `${storeName}-backing` })
  const counts = { getItem: 0 }
  vi.spyOn(localForage, "createInstance").mockImplementationOnce(
    () =>
      ({
        getItem: (k: string) => {
          counts.getItem += 1
          return backing.getItem(k)
        },
        setItem: (k: string, v: unknown) => backing.setItem(k, v),
        removeItem: (k: string) => backing.removeItem(k),
        clear: () => backing.clear(),
      }) as unknown as LocalForage
  )
  return counts
}

// Same interception, but reads park until released — each one snapshotting the stored value at
// the moment it started, so a release after a later write delivers a genuinely stale value.
const deferReadsFor = (storeName: string) => {
  const backing = localForage.createInstance({ name: `${storeName}-backing` })
  const pending: (() => void)[] = []
  vi.spyOn(localForage, "createInstance").mockImplementationOnce(
    () =>
      ({
        getItem: (k: string) => {
          const snapshot = backing.getItem(k)
          return new Promise(resolve => pending.push(() => resolve(snapshot)))
        },
        setItem: (k: string, v: unknown) => backing.setItem(k, v),
        removeItem: (k: string) => backing.removeItem(k),
        clear: () => backing.clear(),
      }) as unknown as LocalForage
  )
  return {
    release: () => pending.splice(0).forEach(resolve => resolve()),
  }
}

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

describe("useOfflineStorage — the load effect", () => {
  it("reads the key once per mount, not once per render", async () => {
    // `initialValue` used to sit in the effect's dep list while every caller passed a fresh
    // `[]`/`{}` literal, so each render re-issued the read. setValue awaits the newest read
    // before it writes, which made every write wait on a round-trip that kept restarting.
    const storeName = `read-count-${Math.random()}`
    const key = "items"
    const counts = countReadsFor(storeName)

    // A fresh literal every render — the shape every caller in the app uses.
    const { rerender } = renderHook(() => useOfflineStorage<string[]>(key, [], storeName))
    await act(async () => {
      await Promise.resolve()
    })
    expect(counts.getItem).toBe(1)

    await act(async () => {
      rerender()
      rerender()
      rerender()
    })
    expect(counts.getItem).toBe(1)
  })

  it("drops an initial read that resolves after a newer value has already been applied", async () => {
    // The read snapshots the value as it was when it started. Applying it afterwards resets both
    // the state and the ref the next functional setValue computes from, so the newer value is
    // silently written back out — the shape of the journey-progress wipe.
    const storeName = `late-read-${Math.random()}`
    const key = "items"
    const read = deferReadsFor(storeName)

    const owner = renderHook(() => useOfflineStorage<string[]>(key, [], storeName))
    read.release()
    await act(async () => {
      await owner.result.current[1](["persisted"])
    })

    // Mount a second instance; its read snapshots ["persisted"] but does not resolve yet.
    const fresh = renderHook(() => useOfflineStorage<string[]>(key, [], storeName))

    // Meanwhile the owner writes again — `fresh` picks that up through the subscription.
    await act(async () => {
      await owner.result.current[1](["persisted", "newer"])
    })
    expect(fresh.result.current[0]).toEqual(["persisted", "newer"])

    // Now the stale read lands.
    await act(async () => {
      read.release()
      await Promise.resolve()
    })
    expect(fresh.result.current[0]).toEqual(["persisted", "newer"])

    // The ref behind it is equally intact: a functional write builds on the newer value.
    await act(async () => {
      await fresh.result.current[1](prev => [...prev, "after"])
    })
    expect(fresh.result.current[0]).toEqual(["persisted", "newer", "after"])
  })
})

// The shape the app really has: one key read by many hooks at once. `useJourneys()` is not a
// context and is instantiated ten times, so two updates can be issued from two instances against
// the same key. Each instance used to compute its next value from its OWN copy, so whichever write
// landed second silently dropped the other — which is how a walk saved the cell it explored and
// lost the position it moved to.
describe("two hooks on one key", () => {
  it("does not lose an update issued from another instance", async () => {
    const store = `shared-${Math.random()}`
    const first = renderHook(() => useOfflineStorage<Record<string, string>>("state", {}, store))
    const second = renderHook(() => useOfflineStorage<Record<string, string>>("state", {}, store))

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      // Interleaved on purpose: one instance adds a key, the other adds a different one.
      await Promise.all([
        first.result.current[1](prev => ({ ...prev, explored: "yes" })),
        second.result.current[1](prev => ({ ...prev, position: "0:25,26" })),
      ])
    })

    // Both survive, whichever order they landed in.
    expect(first.result.current[0]).toEqual({ explored: "yes", position: "0:25,26" })
  })
})

// Writes are ordered by when they were ISSUED, not by when the database happens to finish them. An
// older write landing late used to be broadcast to every subscriber, walking the state backwards —
// which the player saw as the explorer jumping to where it was going, snapping back to where it
// started, and then walking there.
describe("out-of-order writes", () => {
  const reorderWritesFor = (storeName: string) => {
    const backing = localForage.createInstance({ name: `${storeName}-backing` })
    const pending: (() => void)[] = []
    vi.spyOn(localForage, "createInstance").mockImplementationOnce(
      () =>
        ({
          getItem: (k: string) => backing.getItem(k),
          setItem: (k: string, v: unknown) =>
            new Promise(resolve => pending.push(() => resolve(backing.setItem(k, v)))),
          removeItem: (k: string) => backing.removeItem(k),
          clear: () => backing.clear(),
        }) as unknown as LocalForage
    )
    // Finish them in reverse: the first write lands last, exactly the case that walked state back.
    return {
      releaseReversed: () =>
        pending
          .splice(0)
          .reverse()
          .forEach(finish => finish()),
    }
  }

  it("never announces a value an in-flight newer write has already replaced", async () => {
    const storeName = `reorder-${Math.random()}`
    const io = reorderWritesFor(storeName)
    const hook = renderHook(() => useOfflineStorage<string>("position", "start", storeName))

    await act(async () => {
      await Promise.resolve()
    })

    const writes = act(async () => {
      void hook.result.current[1]("first")
      void hook.result.current[1]("second")
      await Promise.resolve()
      io.releaseReversed()
      await Promise.resolve()
    })
    await writes

    expect(hook.result.current[0]).toBe("second")
  })
})
