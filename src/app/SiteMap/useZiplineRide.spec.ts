// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Traversal } from "./obstacleTraversal"

const ride = (over: Partial<Traversal> = {}): Traversal => ({
  kind: "zipline",
  from: [0, 0],
  to: [0, 6],
  dir: "e",
  ...over,
})

const hookWith = async (frames: Record<string, string[]>) => {
  vi.resetModules()
  vi.doMock("./tileAssets", async original => ({
    ...(await original<typeof import("./tileAssets")>()),
    sharedTileFrames: (prefix: string) => frames[prefix] ?? [],
  }))
  return (await import("./useZiplineRide")).useZiplineRide
}

describe("useZiplineRide", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.doUnmock("./tileAssets")
  })

  it("holds the crossing until the ride ends", async () => {
    const useZiplineRide = await hookWith({ "explorer-zip-e": ["e.png"] })
    const { result } = renderHook(() => useZiplineRide())
    let landed = false
    act(() => void result.current.playTraversal(ride()).then(() => (landed = true)))
    expect(result.current.ride).toMatchObject({ sprite: "e.png", mirrored: false })
    await act(async () => result.current.ride!.end())
    expect(landed).toBe(true)
    expect(result.current.ride).toBeNull()
  })

  it("rides west on the east sprite, mirrored", async () => {
    const useZiplineRide = await hookWith({ "explorer-zip-e": ["e.png"] })
    const { result } = renderHook(() => useZiplineRide())
    act(() => void result.current.playTraversal(ride({ dir: "w", from: [0, 6], to: [0, 0] })))
    expect(result.current.ride).toMatchObject({ sprite: "e.png", mirrored: true })
  })

  it.each([
    ["another kind of span", { "explorer-zip-e": ["e.png"] }, ride({ kind: "headwind" }), {}],
    ["a facing with no riding art", {}, ride(), {}],
    ["reduced motion", { "explorer-zip-e": ["e.png"] }, ride(), { reducedMotion: true }],
  ])("crosses at once for %s", async (_, frames, traversal, options) => {
    const useZiplineRide = await hookWith(frames)
    const { result } = renderHook(() => useZiplineRide(options))
    await act(async () => result.current.playTraversal(traversal))
    expect(result.current.ride).toBeNull()
  })

  it("ends a ride whose slide never reports its end", async () => {
    const useZiplineRide = await hookWith({ "explorer-zip-e": ["e.png"] })
    const { result } = renderHook(() => useZiplineRide())
    let landed = false
    act(() => void result.current.playTraversal(ride()).then(() => (landed = true)))
    await act(async () => vi.advanceTimersByTime(result.current.ride!.ms + 250))
    expect(landed).toBe(true)
  })
})
