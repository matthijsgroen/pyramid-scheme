import { describe, expect, it } from "vitest"
import { createJourneysV3Api, type StoredJourneyStateV3 } from "./useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { journeys as allJourneys } from "@/data/journeys"
import { cellAddress } from "@/game/cellAddress"
import { pressAt } from "@/game/mechanismDoors"
import { leverAt, leverFloor, roomBeyondDoorOf, withRemoteMove } from "@/game/testSupport/remoteMechanismFixtures"

const REAL = allJourneys.find(j => j.exterior === "pyramid")!

// The API reads the journeys it was handed, so each call builds one over the store as it stands — the way
// a re-render hands the hook the saved state back.
const journey = () => {
  let state: StoredJourneyStateV3[] = [
    {
      journeyId: REAL.id,
      levelNr: 1,
      completionCount: 0,
      active: true,
      exploredSections: {},
      position: null,
      interiorLevelNr: null,
    },
  ]
  const api = () =>
    createJourneysV3Api({
      journeys: state,
      setJourneys: updater => {
        state = typeof updater === "function" ? updater(state) : updater
      },
      journeyData: [{ id: REAL.id, exterior: "pyramid", levelCount: REAL.levelCount } as TranslatedJourney],
    })
  return { state: () => state[0], states: () => api().getMechanismStates(REAL.id), api }
}

describe("a mechanism's state, however many cells can work it", () => {
  it("is stored under one key whether it is worked from its own cell or from a remote one", () => {
    const grid = leverFloor()
    const home = leverAt(grid)
    const remote = roomBeyondDoorOf(grid, "vault")
    const placed = withRemoteMove(grid, { to: "right", at: remote })
    const store = journey()

    // Worked from the remote cell: the lever goes right...
    const fromRemote = pressAt(placed, 0, remote[0], remote[1], store.states())!
    store.api().setMechanismState(fromRemote.address, fromRemote.state)
    expect(Object.entries(store.state().mechanismStates ?? {})).toEqual([
      [expect.stringContaining(cellAddress(placed, 0, home[0], home[1])!), "right"],
    ])

    // ...and worked from its own cell: it is thrown back by the same entry, not by one of its own.
    const fromHome = pressAt(placed, 0, home[0], home[1], store.states())!
    store.api().setMechanismState(fromHome.address, fromHome.state)
    expect(Object.entries(store.state().mechanismStates ?? {})).toEqual([
      [expect.stringContaining(cellAddress(placed, 0, home[0], home[1])!), "left"],
    ])
  })

  it("is not moved by a remote cell whose move does not leave the state it stands in", () => {
    const grid = leverFloor()
    const remote = roomBeyondDoorOf(grid, "vault")
    // The lever starts left; a move placed out of "right" has nothing to do there.
    const placed = withRemoteMove(grid, { from: "right", to: "left", at: remote })

    expect(pressAt(placed, 0, remote[0], remote[1], new Map())!.state).toBe("left")
  })
})
