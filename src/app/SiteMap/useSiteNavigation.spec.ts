// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CellState, FloorGrid, GridCell, SiteConfig } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useSiteNavigation } from "./useSiteNavigation"

// Every cell carries the section and the ordinal the assembler gives it, because that is what a write
// is filed under now — `${sectionHash}#${floor}/${slot}` for a room, `~${ordinal}` for a corridor
// (cellIdentity.ts). Without them these fixtures would exercise the fallback rather than the real path.
const SECTION = "sec"
const entrance: GridCell = {
  type: "room",
  roomType: "portal",
  dirs: new Set(["e"]),
  state: "completed",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "0",
}
const corridor: GridCell = {
  type: "corridor",
  dirs: new Set(["w", "e"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
}
const puzzleRoom: GridCell = {
  type: "room",
  roomType: "encounter",
  dirs: new Set(["w"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
  pathIndex: 0,
}
const exitRoom: GridCell = {
  type: "room",
  roomType: "portal",
  dirs: new Set(["w"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "2",
}
const fogged: GridCell = {
  type: "corridor",
  dirs: new Set(["w"]),
  state: "fogged",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
}
const gate = (state: CellState = "reachable"): GridCell => ({
  type: "room",
  roomType: "encounter",
  family: "key-gate",
  tags: ["gate"],
  dirs: new Set(["w", "e"]),
  state,
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "2",
})

// What each fixture is filed under once it is placed on the grid.
const CORRIDOR_AT_1 = `${SECTION}#0/~1`
const PUZZLE_AT_1 = `${SECTION}#0/p0`
const GATE_AT_2 = `${SECTION}#0/xkey-gate`
const EXIT_AT_1 = `${SECTION}#0/exit`

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

    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,1", CORRIDOR_AT_1)
    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", CORRIDOR_AT_1, "0:0,1")
  })

  it("opens a room's encounter only once the explorer has walked there", () => {
    const { hook, onEncounter } = setup([entrance, puzzleRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    expect(onEncounter).not.toHaveBeenCalled()

    arrive()

    expect(onEncounter).toHaveBeenCalledWith([0, 1], true)
  })

  // A gate's bars are drawn across the FAR side of its own square, so the square is ground the player
  // stands on and the gate is walked into like any other room — no case of its own in here.
  it("walks onto a gate the same as any other encounter room", () => {
    const { hook, journeys, onEncounter } = setup([entrance, corridor, gate()])

    act(() => hook.result.current.onCellClick(0, 2))
    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", GATE_AT_2, "0:0,2")

    arrive()
    expect(onEncounter).toHaveBeenCalledWith([0, 2], true)
  })

  it("asks about leaving on arrival at an exit, not on the tap that started the walk", () => {
    const { hook, onExitReached } = setup([entrance, exitRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    expect(onExitReached).not.toHaveBeenCalled()

    arrive()

    expect(onExitReached).toHaveBeenCalled()
  })

  // The way out is a cell the player stood on, and the save has to say so. It is the last slot along
  // its chain, so it carries the section's high-water mark with it: without it, every corridor between
  // the last room and the door sits past the mark and comes back fogged on a floor walked to its end.
  it("marks the way out explored, so the walk to it survives a re-carve", () => {
    const { hook, journeys } = setup([entrance, exitRoom])

    act(() => hook.result.current.onCellClick(0, 1))

    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,1", EXIT_AT_1)
  })

  // Writing the exit down completes it, and a completed cell is otherwise only walked to. The way out
  // has to keep working on every later visit — backing out of the prompt, or re-entering a pyramid
  // already finished — so it is answered before the completed-cell case, as a staircase is.
  it("still asks about leaving at a way out already walked", () => {
    const { hook, onExitReached } = setup([entrance, { ...exitRoom, state: "completed" }])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(onExitReached).toHaveBeenCalled()
  })

  it("repositions the player on a completed room without reopening it", () => {
    const { hook, journeys, onEncounter } = setup([entrance, { ...puzzleRoom, state: "completed" }])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", PUZZLE_AT_1, "0:0,1")
    expect(onEncounter).not.toHaveBeenCalled()
  })

  it("reopens a completed chest whose consumable was left behind, once the player is back at it", () => {
    const reward = { type: "consumable", itemId: "bandage" }
    const { hook, onSkippedConsumable } = setup(
      [entrance, { ...puzzleRoom, state: "completed", reward }],
      [PUZZLE_AT_1]
    )

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(onSkippedConsumable).toHaveBeenCalledWith(reward, PUZZLE_AT_1)
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
