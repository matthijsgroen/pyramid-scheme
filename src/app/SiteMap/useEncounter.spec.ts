import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useEncounter } from "./useEncounter"

// No mod app entrypoints are imported here on purpose: with an empty family registry every room
// reads as "family missing", which is the pass-through path this spec pins down. A room's own puzzle
// belongs to its family's plugin, not to core.
const gridOf = (cells: GridCell[]): FloorGrid => ({
  cells: [cells],
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 0],
  exitPos: [0, cells.length - 1],
  siteId: "test-site",
  staircases: {},
})

const setup = (cells: GridCell[]) => {
  const journeys = { markCellExplored: vi.fn() } as unknown as JourneyAPI
  const onReward = vi.fn()
  const hook = renderHook(() =>
    useEncounter({
      journeys,
      journeyId: "j1",
      currentFloor: 0,
      difficulty: "starter",
      grid: gridOf(cells),
      ownedKeys: new Set<string>(),
      onReward,
    })
  )
  return { hook, journeys, onReward }
}

const emptyRoom: GridCell = { type: "room", roomType: "encounter", dirs: new Set(["e"]), state: "reachable" }

describe("useEncounter", () => {
  it("resolves a room whose family isn't registered, so a toggled-off mod can't strand the player", () => {
    const { hook, journeys } = setup([emptyRoom])

    act(() => hook.result.current.open([0, 0], true))

    expect(journeys.markCellExplored).toHaveBeenCalledWith("", "0:0,0")
    expect(hook.result.current.isOpen).toBe(false)
  })

  it("hands a solved room's loot on for offering, keyed to the room it came from", () => {
    const { hook, onReward } = setup([{ ...emptyRoom, reward: { type: "consumable", itemId: "bandage" } }])

    act(() => hook.result.current.open([0, 0], true))

    expect(onReward).toHaveBeenCalledWith({ type: "consumable", itemId: "bandage" }, "0:0,0", undefined)
  })

  it("says which key a coloured chest held, so the reveal names the door it opens", () => {
    const { hook, onReward } = setup([{ ...emptyRoom, reward: { type: "tombKey", keyId: "k1" }, keyColor: "blue" }])

    act(() => hook.result.current.open([0, 0], true))

    expect(onReward.mock.calls[0][2]).toEqual(["blue"])
  })

  it("doesn't announce a key for a coloured chest holding something else", () => {
    const { hook, onReward } = setup([
      { ...emptyRoom, reward: { type: "consumable", itemId: "bandage" }, keyColor: "blue" },
    ])

    act(() => hook.result.current.open([0, 0], true))

    expect(onReward.mock.calls[0][2]).toBeUndefined()
  })

  it("offers nothing for an empty room, while still marking it explored", () => {
    const { hook, journeys, onReward } = setup([emptyRoom])

    act(() => hook.result.current.open([0, 0], true))

    expect(journeys.markCellExplored).toHaveBeenCalled()
    expect(onReward).not.toHaveBeenCalled()
  })
})
