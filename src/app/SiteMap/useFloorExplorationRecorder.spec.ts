import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useFloorExplorationRecorder } from "./useFloorExplorationRecorder"

// A fogged corridor is content never entered, so this floor reads as "still stuff to find" — enough
// to prove a summary was recorded. What makes a floor open is floorExploration.spec's subject.
const foggedCorridor: GridCell = { type: "corridor", dirs: new Set(["e"]), state: "fogged" }
const entrance: GridCell = { type: "room", roomType: "portal", dirs: new Set(["w"]), state: "completed" }

const gridWithContent: FloorGrid = {
  cells: [[foggedCorridor, entrance]],
  rows: 1,
  cols: 2,
  entrancePos: [0, 1],
  exitPos: [0, 1],
  siteId: "test-site",
  staircases: {},
}

const fakeJourneys = () => {
  const registerFloorExploration = vi.fn()
  return { api: { registerFloorExploration } as unknown as JourneyAPI, registerFloorExploration }
}

describe("useFloorExplorationRecorder", () => {
  it("writes nothing while the player is still on the floor, so a write can't re-enter render", () => {
    const { api, registerFloorExploration } = fakeJourneys()

    const { rerender } = renderHook(() =>
      useFloorExplorationRecorder({ journeys: api, journeyId: "j1", currentFloor: 0, grid: gridWithContent })
    )
    rerender()

    expect(registerFloorExploration).not.toHaveBeenCalled()
  })

  it("records the floor's final state when the player leaves the interior", () => {
    const { api, registerFloorExploration } = fakeJourneys()
    const { unmount } = renderHook(() =>
      useFloorExplorationRecorder({ journeys: api, journeyId: "j1", currentFloor: 0, grid: gridWithContent })
    )

    unmount()

    expect(registerFloorExploration).toHaveBeenCalledWith("j1", 0, true, [])
  })

  it("records against the floor being left, not the one being entered", () => {
    const { api, registerFloorExploration } = fakeJourneys()
    const { rerender } = renderHook(
      ({ currentFloor }) =>
        useFloorExplorationRecorder({ journeys: api, journeyId: "j1", currentFloor, grid: gridWithContent }),
      { initialProps: { currentFloor: 0 } }
    )

    rerender({ currentFloor: 1 })

    expect(registerFloorExploration).toHaveBeenCalledTimes(1)
    expect(registerFloorExploration.mock.calls[0][1]).toBe(0)
  })

  it("records nothing for a floor that never assembled, rather than a blank summary", () => {
    const { api, registerFloorExploration } = fakeJourneys()
    const { unmount } = renderHook(() =>
      useFloorExplorationRecorder({ journeys: api, journeyId: "j1", currentFloor: 0, grid: null })
    )

    unmount()

    expect(registerFloorExploration).not.toHaveBeenCalled()
  })
})
