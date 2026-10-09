// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { cellAddress } from "@/game/cellAddress"
import { legalTargets } from "@/game/mechanismDoors"
import type { FloorGrid } from "@/game/siteTypes"
import { homeOf, TWO_TORCHES } from "@/game/testSupport/torchFloodFixtures"
import { PLAYGROUND_JOURNEY } from "./playgroundCarve.testing"
import { carved } from "./torchFlood.testing"
import { useDousedJourneys } from "./useDousedJourneys"

// A made-up lock whose hall starts flooded: S at a keeps it covered until thrown to b.
const FLOODED_AT_START =
  "in -- hub -- hall\nhub -[B]- out\nhall -[S:b]\nS toggle @hub\nB torch @hall lit\nin ?\nhub ?\nhall ?\nout ?"

// One journey's save, counting every journeys write, the way remoteMechanismState.spec keeps one.
const store = () => {
  let docs: StoredJourneyStateV3[] = [
    {
      journeyId: PLAYGROUND_JOURNEY,
      levelNr: 1,
      completionCount: 0,
      active: true,
      exploredSections: {},
      position: null,
      interiorLevelNr: null,
    },
  ]
  let writes = 0
  const api = (): JourneyAPI =>
    createJourneysV3Api({
      journeys: docs,
      setJourneys: updater => {
        writes++
        docs = typeof updater === "function" ? updater(docs) : updater
      },
      journeyData: [{ id: PLAYGROUND_JOURNEY, exterior: "pyramid", levelCount: 1 } as TranslatedJourney],
    }) as JourneyAPI
  return { api, writes: () => writes, saved: () => api().getMechanismStates(PLAYGROUND_JOURNEY) }
}

const NO_KEYS: ReadonlySet<string> = new Set()
const mount = (grid: FloorGrid, save: ReturnType<typeof store>, heldKeys: ReadonlySet<string> = NO_KEYS) =>
  renderHook(
    ({ journeys }) =>
      useDousedJourneys({ journeys, journeyId: PLAYGROUND_JOURNEY, floor: grid, currentFloor: 0, heldKeys }),
    { initialProps: { journeys: save.api() } }
  )

describe("play's douse", () => {
  const { grid } = carved(TWO_TORCHES)
  const address = (id: string) => cellAddress(grid, 0, ...homeOf(grid, id).at)!

  it("writes nothing on arriving while the hall is dry", () => {
    const save = store()
    mount(grid, save)
    expect(save.writes()).toBe(0)
  })

  it("writes the lever and the doused torch in one write, and a reload reads both", () => {
    const save = store()
    const { result } = mount(grid, save)
    act(() => result.current.setMechanismState(address("S"), "b"))
    expect(save.writes()).toBe(1)
    expect(save.saved().get(address("S"))).toBe("b")
    expect(save.saved().get(address("B"))).toBe("off")
  })

  it("offers the light once the water goes, and keeps the torch lit when lit", () => {
    const save = store()
    const { result, rerender } = mount(grid, save)
    act(() => result.current.setMechanismState(address("S"), "b"))
    rerender({ journeys: save.api() })
    act(() => result.current.setMechanismState(address("S"), "a"))
    rerender({ journeys: save.api() })
    expect(save.saved().get(address("B"))).toBe("off")
    expect(legalTargets(homeOf(grid, "B").cell.mechanism!, save.saved().get(address("B"))!)).toEqual(["on"])
    act(() => result.current.setMechanismState(address("B"), "on"))
    rerender({ journeys: save.api() })
    expect(save.saved().get(address("B"))).toBe("on")
  })

  it("writes several states in one write", () => {
    const save = store()
    const { result } = mount(grid, save)
    act(() =>
      result.current.setMechanismStates(
        new Map([
          [address("S"), "b"],
          [address("A"), "on"],
        ])
      )
    )
    expect(save.writes()).toBe(1)
    expect(save.saved().get(address("A"))).toBe("off")
  })
})

describe("arriving on a floor whose hall starts flooded", () => {
  const { grid } = carved(FLOODED_AT_START)
  const address = (id: string) => cellAddress(grid, 0, ...homeOf(grid, id).at)!

  it("writes the lit torch out, and it stays out once the water goes, until lit by hand", () => {
    const save = store()
    const { result, rerender } = mount(grid, save)
    expect(save.writes()).toBe(1)
    expect(save.saved().get(address("B"))).toBe("off")
    rerender({ journeys: save.api() })
    expect(save.writes()).toBe(1)
    act(() => result.current.setMechanismState(address("S"), "b"))
    rerender({ journeys: save.api() })
    expect(save.saved().get(address("B"))).toBe("off")
    act(() => result.current.setMechanismState(address("B"), "on"))
    rerender({ journeys: save.api() })
    expect(save.saved().get(address("B"))).toBe("on")
  })
})

describe("a hall barrier a floor key also holds shut", () => {
  // The made-up floor: TWO_TORCHES with its hall's barrier doors also wanting the floor key `key:hall`, so the hall
  // stays covered, whatever the lever says, until the key is held.
  const { grid: dry } = carved(TWO_TORCHES)
  const grid: FloorGrid = {
    ...dry,
    cells: dry.cells.map(row =>
      row.map(cell => (cell.type === "room" && cell.regionBarrier ? { ...cell, requiredKeyIds: ["key:hall"] } : cell))
    ),
  }
  const address = (id: string) => cellAddress(grid, 0, ...homeOf(grid, id).at)!

  it("puts the lit torch out on arriving without the key", () => {
    const save = store()
    mount(grid, save)
    expect(save.writes()).toBe(1)
    expect(save.saved().get(address("B"))).toBe("off")
  })

  it("leaves it lit on arriving with the key held", () => {
    const save = store()
    mount(grid, save, new Set(["key:hall"]))
    expect(save.writes()).toBe(0)
    expect(save.saved().get(address("B"))).toBeUndefined()
  })
})
