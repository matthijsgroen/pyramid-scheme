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

// The same floor with its corridor walked: nothing left to find, so this one reads as closed.
const exploredGrid: FloorGrid = {
  ...gridWithContent,
  cells: [[{ ...foggedCorridor, state: "completed" }, entrance]],
}

const fakeJourneys = () => {
  const registerFloorExploration = vi.fn()
  return { api: { registerFloorExploration } as unknown as JourneyAPI, registerFloorExploration }
}

describe("useFloorExplorationRecorder", () => {
  it("writes nothing while the player is still on the floor, so a write can't re-enter render", () => {
    const { api, registerFloorExploration } = fakeJourneys()

    const { rerender } = renderHook(() =>
      useFloorExplorationRecorder({
        journeys: api,
        journeyId: "j1",
        levelNr: 3,
        currentFloor: 0,
        grid: gridWithContent,
      })
    )
    rerender()

    expect(registerFloorExploration).not.toHaveBeenCalled()
  })

  it("records the floor's final state when the player leaves the interior", () => {
    const { api, registerFloorExploration } = fakeJourneys()
    const { unmount } = renderHook(() =>
      useFloorExplorationRecorder({
        journeys: api,
        journeyId: "j1",
        levelNr: 3,
        currentFloor: 0,
        grid: gridWithContent,
      })
    )

    unmount()

    expect(registerFloorExploration).toHaveBeenCalledWith("j1", 3, 0, true, [])
  })

  it("records against the floor being left, not the one being entered", () => {
    const { api, registerFloorExploration } = fakeJourneys()
    const { rerender } = renderHook(
      ({ currentFloor }) =>
        useFloorExplorationRecorder({
          journeys: api,
          journeyId: "j1",
          levelNr: 3,
          currentFloor,
          grid: gridWithContent,
        }),
      { initialProps: { currentFloor: 0 } }
    )

    rerender({ currentFloor: 1 })

    expect(registerFloorExploration).toHaveBeenCalledTimes(1)
    expect(registerFloorExploration.mock.calls[0][2]).toBe(0)
  })

  it("records the summary of the floor being left, not the fog of the one being entered", () => {
    const { api, registerFloorExploration } = fakeJourneys()
    // A staircase renders the arrived floor — all fog, so "still stuff to find" — in the same commit
    // that the floor number changes, and only then is the floor left behind written. Reading the new
    // floor's summary there stamped every floor the player finished as unexplored, and its pyramid
    // went on pulsing on the map until a second visit.
    const { rerender } = renderHook(
      ({ currentFloor, grid }) =>
        useFloorExplorationRecorder({ journeys: api, journeyId: "j1", levelNr: 3, currentFloor, grid }),
      { initialProps: { currentFloor: 0, grid: exploredGrid } }
    )

    rerender({ currentFloor: 1, grid: gridWithContent })

    expect(registerFloorExploration).toHaveBeenCalledWith("j1", 3, 0, false, [])
  })

  it("records nothing for a floor that never assembled, rather than a blank summary", () => {
    const { api, registerFloorExploration } = fakeJourneys()
    const { unmount } = renderHook(() =>
      useFloorExplorationRecorder({ journeys: api, journeyId: "j1", levelNr: 3, currentFloor: 0, grid: null })
    )

    unmount()

    expect(registerFloorExploration).not.toHaveBeenCalled()
  })
})
