// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { StoredJourneyStateV3 } from "@/app/state/useJourneys"
import type { RelaidPyramid } from "./relaidPyramids"
import { useRelaidFloorsBackfill } from "./useRelaidFloorsBackfill"

const RELAID: readonly RelaidPyramid[] = [{ journeyId: "made_up", levelNr: 2 }]

const save = (journeyId: string, levelNr: number): StoredJourneyStateV3 => ({
  journeyId,
  levelNr,
  completionCount: 0,
  active: true,
  exploredSections: {},
  position: null,
  positionKey: "main#0/p1",
  interiorLevelNr: levelNr,
})

const fakeJourneys = (outstanding: StoredJourneyStateV3[]) => ({
  journeysNeedingRelaidFloors: vi.fn(() => outstanding),
  setRelaidFloors: vi.fn(),
})

describe("useRelaidFloorsBackfill", () => {
  it("stamps every outstanding save, and forgets the place only of one inside a re-laid pyramid", () => {
    const journeys = fakeJourneys([save("made_up", 2), save("made_up", 3), save("other", 2)])

    renderHook(() => useRelaidFloorsBackfill(journeys, RELAID))

    expect(journeys.setRelaidFloors.mock.calls).toEqual([
      ["made_up", true],
      ["made_up", false],
      ["other", false],
    ])
  })

  it("runs once, however often the app re-renders", () => {
    const journeys = fakeJourneys([save("made_up", 2)])

    const { rerender } = renderHook(() => useRelaidFloorsBackfill(journeys, RELAID))
    rerender()
    rerender()

    expect(journeys.setRelaidFloors).toHaveBeenCalledTimes(1)
  })

  it("writes nothing when every save is stamped", () => {
    const journeys = fakeJourneys([])

    renderHook(() => useRelaidFloorsBackfill(journeys, RELAID))

    expect(journeys.setRelaidFloors).not.toHaveBeenCalled()
  })
})
