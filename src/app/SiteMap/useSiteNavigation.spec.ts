import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FloorGrid, GridCell, SiteConfig } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useSiteNavigation } from "./useSiteNavigation"

const entrance: GridCell = { type: "room", roomType: "portal", dirs: new Set(["e"]), state: "completed" }
const corridor: GridCell = { type: "corridor", dirs: new Set(["w", "e"]), state: "reachable" }
const puzzleRoom: GridCell = { type: "room", roomType: "encounter", dirs: new Set(["w"]), state: "reachable" }
const exitRoom: GridCell = { type: "room", roomType: "portal", dirs: new Set(["w"]), state: "reachable" }
const fogged: GridCell = { type: "corridor", dirs: new Set(["w"]), state: "fogged" }

const gridOf = (cells: GridCell[]): FloorGrid => ({
  cells: [cells],
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 0],
  exitPos: [0, cells.length - 1],
  siteId: "test-site",
  staircases: {},
})

const siteConfig: SiteConfig = [
  { pathPuzzles: 1, difficulty: "starter", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
]

const setup = (cells: GridCell[], skipped: string[] = []) => {
  const journeys = {
    markCellExplored: vi.fn(),
    updatePosition: vi.fn(),
    getPurchasedShopSlots: () => new Set<string>(),
    getSkippedConsumables: () => new Set(skipped),
  } as unknown as JourneyAPI
  const onEncounter = vi.fn()
  const onSkippedConsumable = vi.fn()
  const onExitReached = vi.fn()
  const hook = renderHook(() =>
    useSiteNavigation({
      journeys,
      journeyId: "j1",
      siteConfig,
      seed: 1,
      currentFloor: 0,
      grid: gridOf(cells),
      explorerPos: [0, 0],
      onEncounter,
      onSkippedConsumable,
      onExitReached,
    })
  )
  return { hook, journeys, onEncounter, onSkippedConsumable, onExitReached }
}

// Anything "on arrival" waits out the walk; the tests jump past it.
const arrive = () => act(() => void vi.advanceTimersByTime(2000))

describe("useSiteNavigation", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("ignores a tap on ground the player can't reach, so fog can't be walked into", () => {
    const { hook, journeys } = setup([entrance, fogged])

    act(() => hook.result.current.onCellClick(0, 1))

    expect(journeys.updatePosition).not.toHaveBeenCalled()
  })

  it("walks into a corridor and marks it explored", () => {
    const { hook, journeys } = setup([entrance, corridor])

    act(() => hook.result.current.onCellClick(0, 1))

    expect(journeys.markCellExplored).toHaveBeenCalledWith("", "0:0,1")
    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", "0:0,1")
  })

  it("opens a room's encounter only once the explorer has walked there", () => {
    const { hook, onEncounter } = setup([entrance, puzzleRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    expect(onEncounter).not.toHaveBeenCalled()

    arrive()

    expect(onEncounter).toHaveBeenCalledWith([0, 1], true)
  })

  it("asks about leaving on arrival at an exit, not on the tap that started the walk", () => {
    const { hook, onExitReached } = setup([entrance, exitRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    expect(onExitReached).not.toHaveBeenCalled()

    arrive()

    expect(onExitReached).toHaveBeenCalled()
  })

  it("repositions the player on a completed room without reopening it", () => {
    const { hook, journeys, onEncounter } = setup([entrance, { ...puzzleRoom, state: "completed" }])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", "0:0,1")
    expect(onEncounter).not.toHaveBeenCalled()
  })

  it("reopens a completed chest whose consumable was left behind, once the player is back at it", () => {
    const reward = { type: "consumable", itemId: "bandage" }
    const { hook, onSkippedConsumable } = setup([entrance, { ...puzzleRoom, state: "completed", reward }], ["0:0,1"])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(onSkippedConsumable).toHaveBeenCalledWith(reward, "0:0,1")
  })

  it("reopens a completed shop that still has unbought stock", () => {
    const { hook, onEncounter } = setup([
      entrance,
      { ...puzzleRoom, state: "completed", stock: [{ type: "consumable", itemId: "bandage" }] },
    ])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    // freshArrival: the player walked here from elsewhere, which is what a shop's stock reset reads.
    expect(onEncounter).toHaveBeenCalledWith([0, 1], true)
  })
})
