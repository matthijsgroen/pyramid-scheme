import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useCorridorDetection } from "./useCorridorDetection"

const fakeJourneys = (outstandingInPyramid = 0) => {
  const registerHiddenCorridors = vi.fn()
  const markCorridorFound = vi.fn()
  const api = {
    registerHiddenCorridors,
    markCorridorFound,
    getOutstandingHiddenCorridorCount: () => outstandingInPyramid,
  } as unknown as JourneyAPI
  return { api, registerHiddenCorridors, markCorridorFound }
}

// grid: null keeps proximity out of the picture — the walk itself is covered by corridorProximity.spec.
const args = (over: Partial<Parameters<typeof useCorridorDetection>[0]> & { journeys: JourneyAPI }) => ({
  journeyId: "j1",
  currentFloor: 0,
  detectorLevel: 1,
  grid: null,
  explorerPos: [0, 0] as readonly [number, number],
  hiddenSectionHashes: new Set<string>(),
  junctionSections: new Map<string, ReadonlySet<string>>(),
  foundCorridors: new Set<string>(),
  ...over,
})

describe("useCorridorDetection", () => {
  it("registers this floor's hidden corridors as known, so the pyramid tally counts viewed floors", () => {
    const { api, registerHiddenCorridors } = fakeJourneys()

    renderHook(() => useCorridorDetection(args({ journeys: api, hiddenSectionHashes: new Set(["h2", "h1"]) })))

    expect(registerHiddenCorridors).toHaveBeenCalledTimes(1)
    expect(registerHiddenCorridors.mock.calls[0][0].sort()).toEqual(["h1", "h2"])
  })

  it("registers once per floor's worth of corridors, so a re-render can't feed a write loop", () => {
    const { api, registerHiddenCorridors } = fakeJourneys()
    const hiddenSectionHashes = new Set(["h1"])
    const { rerender } = renderHook(() => useCorridorDetection(args({ journeys: api, hiddenSectionHashes })))

    rerender()

    expect(registerHiddenCorridors).toHaveBeenCalledTimes(1)
  })

  it("marks the corridor found when the player stands on the junction bordering it", () => {
    const { api, markCorridorFound } = fakeJourneys()

    renderHook(() =>
      useCorridorDetection(
        args({
          journeys: api,
          explorerPos: [2, 3],
          junctionSections: new Map([["2,3", new Set(["h1"])]]),
        })
      )
    )

    expect(markCorridorFound).toHaveBeenCalledWith("h1")
  })

  it("finds nothing without the detector — the player glides past the junction unaware", () => {
    const { api, markCorridorFound } = fakeJourneys()

    renderHook(() =>
      useCorridorDetection(
        args({
          journeys: api,
          detectorLevel: 0,
          explorerPos: [2, 3],
          junctionSections: new Map([["2,3", new Set(["h1"])]]),
        })
      )
    )

    expect(markCorridorFound).not.toHaveBeenCalled()
  })

  it("reports this floor as holding a corridor only while one is still unnoticed", () => {
    const { api } = fakeJourneys()
    const hiddenSectionHashes = new Set(["h1"])

    const { result, rerender } = renderHook(
      ({ foundCorridors }) => useCorridorDetection(args({ journeys: api, hiddenSectionHashes, foundCorridors })),
      { initialProps: { foundCorridors: new Set<string>() } }
    )
    expect(result.current.onThisFloor).toBe(true)

    rerender({ foundCorridors: new Set(["h1"]) })

    expect(result.current.onThisFloor).toBe(false)
  })

  it("points at another floor only for corridors this floor doesn't already account for", () => {
    // Two outstanding in the pyramid, one of them right here: exactly one waits elsewhere.
    const { api } = fakeJourneys(2)

    const { result } = renderHook(() =>
      useCorridorDetection(args({ journeys: api, hiddenSectionHashes: new Set(["h1"]) }))
    )

    expect(result.current.onOtherFloor).toBe(true)
  })

  it("keeps quiet about other floors when this floor is the only one outstanding", () => {
    const { api } = fakeJourneys(1)

    const { result } = renderHook(() =>
      useCorridorDetection(args({ journeys: api, hiddenSectionHashes: new Set(["h1"]) }))
    )

    expect(result.current.onOtherFloor).toBe(false)
  })
})
