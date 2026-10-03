// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { revealAll } from "@/game/gridNavigation"
import type { FloorGrid } from "@/game/siteTypes"
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

const stubJourneys = () =>
  ({
    markCellExplored: vi.fn(),
    updatePosition: vi.fn(),
    getPurchasedShopSlots: () => new Set<string>(),
    getSkippedConsumables: () => new Set<string>(),
    getMechanismStates: vi.fn(() => new Map<string, string>()),
    setMechanismState: vi.fn(),
  }) as unknown as JourneyAPI

describe("a tap on a carved floor goes through the offer layer", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("moves nobody on a tap nothing offers, and lands every offered tap on its resolved target", () => {
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
          onSkippedConsumable: () => {},
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
          const want = encodeEdge(0, target[0], target[1])
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
