// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { findPath, revealAll, walkableFrom } from "@/game/gridNavigation"
import { passageCrossing } from "@/game/passages"
import type { FloorGrid, GridCell } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"
import { encodeEdge } from "./edgeId"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"
import { useSiteNavigation } from "./useSiteNavigation"

// THE HOOK AND THE OFFER LAYER ARE ONE DOOR. A tap the map does not offer moves nobody and writes
// nothing; a tap it offers lands on the cell the offer resolves to. Walked on real carved floors,
// revealed whole so every straight run the map never offers is there to be tapped.
const SAMPLE_EVERY = 9

const carve = (floor: ReturnType<typeof allFloors>[number]): FloorGrid | null => {
  const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
    resolveKeyRequirements,
    floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
  })
  return result.success ? revealAll(result.grid) : null
}

// The cell an offered tap puts the explorer on: the target itself, except a narrow passage, which nobody stands in.
const landingOf = (grid: FloorGrid, from: readonly [number, number], target: readonly [number, number]) => {
  const walkable = walkableFrom(grid, from)
  const crossing = passageCrossing(
    grid,
    target[0],
    target[1],
    (r, c) => walkable.has(`${r},${c}`),
    (r, c) => findPath(grid, from, [r, c]).length
  )
  return crossing ? crossing.near : target
}

const stubJourneys = () =>
  ({
    markCellExplored: vi.fn(),
    updatePosition: vi.fn(),
    getPurchasedShopSlots: () => new Set<string>(),
    getMechanismStates: vi.fn(() => new Map<string, string>()),
    setMechanismState: vi.fn(),
    setMechanismStates: vi.fn(),
    recordWalkedSteps: vi.fn(),
  }) as unknown as JourneyAPI

describe("a tap on a carved floor goes through the offer layer", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("moves nobody on a tap nothing offers, and lands every offered tap on its resolved target, a narrow passage's on its near side", () => {
    const floors = allFloors().filter((_, i) => i % SAMPLE_EVERY === 0)
    let refused = 0
    let refusedStraightRun = 0
    let offered = 0
    let redirected = 0
    const faults: string[] = []

    for (const floor of floors) {
      const grid = carve(floor)
      if (!grid) continue
      const journeys = stubJourneys()
      const explorerPos = grid.entrancePos
      const hook = renderHook(() =>
        useSiteNavigation({
          journeys,
          journeyId: floor.journeyId,
          siteConfig: [floor.config],
          seed: floor.seed,
          currentFloor: 0,
          grid,
          explorerPos,
          onEncounter: () => {},
          onExitReached: () => {},
        })
      )
      const offers = offeredTargets(grid, buildRoomClaims(grid), explorerPos)

      for (let r = -1; r <= grid.rows; r++) {
        for (let c = -1; c <= grid.cols; c++) {
          vi.mocked(journeys.updatePosition).mockClear()
          vi.mocked(journeys.markCellExplored).mockClear()
          act(() => hook.result.current.onCellClick(r, c))
          act(() => void vi.runAllTimers())
          const moved = vi.mocked(journeys.updatePosition).mock.calls
          const written = vi.mocked(journeys.markCellExplored).mock.calls
          const target = offers.get(`${r},${c}`)
          if (!target) {
            refused++
            const cell = grid.cells[r]?.[c]
            if (cell?.type === "corridor" && cell.state === "reachable") refusedStraightRun++
            if (moved.length || written.length)
              faults.push(`${floor.label}: a tap at ${r},${c} nobody offers wrote something`)
            continue
          }
          offered++
          if (target[0] !== r || target[1] !== c) redirected++
          const [landRow, landCol] = landingOf(grid, explorerPos, target)
          const want = encodeEdge(0, landRow, landCol)
          if (moved.length !== 1 || moved[0][2] !== want)
            faults.push(`${floor.label}: the offer at ${r},${c} should land on ${want}, wrote ${JSON.stringify(moved)}`)
        }
      }
    }

    expect(faults).toEqual([])
    // A sweep that refused or offered nothing would prove nothing.
    expect(refused).toBeGreaterThan(100)
    expect(refusedStraightRun).toBeGreaterThan(0)
    expect(offered).toBeGreaterThan(20)
    expect(redirected).toBeGreaterThan(0)
  }, 120_000)
})

// A player's room, three straight corridor cells, then a door with no board of its own: shut bars, or a narrow
// passage with ground beyond it. Either way the run up the corridor ends in front of the door.
const corridorToDoor = (door: "shut" | "passage"): FloorGrid => {
  const cells: GridCell[] = [{ type: "room", roomType: "encounter", dirs: new Set(["e"]), state: "completed" }]
  for (let i = 0; i < 3; i++) cells.push({ type: "corridor", dirs: new Set(["e", "w"]), state: "reachable" })
  cells.push({
    type: "room",
    roomType: "encounter",
    dirs: new Set(door === "passage" ? ["w", "e"] : ["w"]),
    state: "reachable",
    requiredKeyId: "door",
    tags: ["gate"],
    ...(door === "passage" ? { passage: { realisation: "narrowPassage" } } : {}),
  })
  if (door === "passage") cells.push({ type: "room", roomType: "encounter", dirs: new Set(["w"]), state: "fogged" })
  return {
    siteId: "t",
    rows: 1,
    cols: cells.length,
    entrancePos: [0, 0],
    exitPos: [0, 0],
    staircases: {},
    cells: [cells],
  }
}

describe("the arrow up a corridor that ends at a door", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it.each(["shut", "passage"] as const)("walks the explorer up to a %s door, handed on as the map hands it", door => {
    const grid = corridorToDoor(door)
    const journeys = stubJourneys()
    const hook = renderHook(() =>
      useSiteNavigation({
        journeys,
        journeyId: "t",
        siteConfig: [],
        seed: 0,
        currentFloor: 0,
        grid,
        explorerPos: [0, 0],
        onEncounter: () => {},
        onExitReached: () => {},
      })
    )
    // The map attaches the tap on the arrow to the cell the offer resolves to, and hands that cell on.
    const target = offeredTargets(grid, buildRoomClaims(grid), [0, 0]).get("0,1")
    expect(target).toEqual([0, 3])
    act(() => hook.result.current.onCellClick(target![0], target![1]))
    act(() => void vi.runAllTimers())
    expect(vi.mocked(journeys.updatePosition).mock.calls.map(call => call[2])).toEqual([encodeEdge(0, 0, 3)])
  })
})
