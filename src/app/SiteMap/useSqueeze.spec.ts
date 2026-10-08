// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Traversal } from "./obstacleTraversal"

const crack = (over: Partial<Traversal> = {}): Traversal => ({
  kind: "narrowPassage",
  from: [0, 0],
  via: [0, 1],
  to: [0, 2],
  dir: "e",
  ...over,
})

const hookWith = async (frames: Record<string, string[]>) => {
  vi.resetModules()
  vi.doMock("./tileAssets", async original => ({
    ...(await original<typeof import("./tileAssets")>()),
    sharedTileFrames: (prefix: string) => frames[prefix] ?? [],
  }))
  return await import("./useSqueeze")
}

describe("useSqueeze", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.doUnmock("./tileAssets")
  })

  it("holds the crossing until the squeeze ends", async () => {
    const { useSqueeze } = await hookWith({ "explorer-squeeze-e": ["e.png"] })
    const { result } = renderHook(() => useSqueeze())
    let landed = false
    act(() => void result.current.playTraversal(crack()).then(() => (landed = true)))
    expect(result.current.squeeze).toMatchObject({
      traversal: { via: [0, 1] },
      msPerLeg: 1000,
      ms: 2000,
      way: "sideways",
    })
    await act(async () => result.current.squeeze!.end())
    expect(landed).toBe(true)
    expect(result.current.squeeze).toBeNull()
  })

  it.each([
    ["north", "headOn", crack({ from: [2, 1], via: [1, 1], to: [0, 1], dir: "n" })],
    ["south", "headOn", crack({ from: [0, 1], via: [1, 1], to: [2, 1], dir: "s" })],
    ["east", "sideways", crack()],
    ["west", "sideways", crack({ from: [0, 2], to: [0, 0], dir: "w" })],
    ["round a corner", "corner", crack({ from: [-1, 1], via: [0, 1], to: [0, 2], dir: "e" })],
  ])("plays a crack crossed %s as a %s squeeze", async (_, way, traversal) => {
    const { useSqueeze } = await hookWith({ "explorer-squeeze-e": ["e.png"], "explorer-squeeze-s": ["s.png"] })
    const { result } = renderHook(() => useSqueeze())
    act(() => void result.current.playTraversal(traversal))
    expect(result.current.squeeze?.way).toBe(way)
  })

  it("draws west with the east pose mirrored, and north with the south pose", async () => {
    const { squeezeSprite } = await hookWith({ "explorer-squeeze-e": ["e.png"], "explorer-squeeze-s": ["s.png"] })
    expect(squeezeSprite("w")).toEqual({ url: "e.png", mirrored: true })
    expect(squeezeSprite("n")).toEqual({ url: "s.png", mirrored: false })
    expect(squeezeSprite("s")).toEqual({ url: "s.png", mirrored: false })
  })

  it.each([
    ["a span with no wall to pass", { "explorer-squeeze-e": ["e.png"] }, crack({ via: undefined }), {}],
    ["a heading with no squeezing art", {}, crack(), {}],
    [
      "a corner whose first leg has no squeezing art",
      { "explorer-squeeze-e": ["e.png"] },
      crack({ from: [-1, 1], via: [0, 1], to: [0, 2], dir: "e" }),
      {},
    ],
    ["reduced motion", { "explorer-squeeze-e": ["e.png"] }, crack(), { reducedMotion: true }],
  ])("crosses at once for %s", async (_, frames, traversal, options) => {
    const { useSqueeze } = await hookWith(frames)
    const { result } = renderHook(() => useSqueeze(options))
    await act(async () => result.current.playTraversal(traversal))
    expect(result.current.squeeze).toBeNull()
  })

  it("ends a squeeze whose slide never reports its end", async () => {
    const { useSqueeze } = await hookWith({ "explorer-squeeze-e": ["e.png"] })
    const { result } = renderHook(() => useSqueeze())
    let landed = false
    act(() => void result.current.playTraversal(crack()).then(() => (landed = true)))
    await act(async () => vi.advanceTimersByTime(2000 + 249))
    expect(landed).toBe(false)
    await act(async () => vi.advanceTimersByTime(1))
    expect(landed).toBe(true)
  })

  it("lands a head-on squeeze after 700 ms and a sideways one after 2000 ms", async () => {
    const { useSqueeze } = await hookWith({ "explorer-squeeze-e": ["e.png"], "explorer-squeeze-s": ["s.png"] })
    const headOn = crack({ from: [0, 1], via: [1, 1], to: [2, 1], dir: "s" })
    for (const [traversal, ms] of [
      [headOn, 700],
      [crack(), 2000],
    ] as const) {
      const { result } = renderHook(() => useSqueeze())
      let landed = false
      act(() => void result.current.playTraversal(traversal).then(() => (landed = true)))
      expect(result.current.squeeze?.ms).toBe(ms)
      await act(async () => vi.advanceTimersByTime(ms + 249))
      expect(landed).toBe(false)
      await act(async () => vi.advanceTimersByTime(1))
      expect(landed).toBe(true)
    }
  })

  it("ends a squeeze that is taken off the map mid-slide", async () => {
    const { useSqueeze } = await hookWith({ "explorer-squeeze-e": ["e.png"] })
    const { result, unmount } = renderHook(() => useSqueeze())
    let landed = false
    act(() => void result.current.playTraversal(crack()).then(() => (landed = true)))
    unmount()
    await act(async () => {})
    expect(landed).toBe(true)
  })
})
