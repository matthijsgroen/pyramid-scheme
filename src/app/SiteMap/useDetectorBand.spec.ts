import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { CompassHit, ConsumableResult, DetectorMode, FloorGrid, GridCell } from "@/game/siteTypes"
import type { DetectorAPI } from "@/app/state/useDetector"
import type { CorridorDetection } from "./useCorridorDetection"
import { useDetectorBand } from "./useDetectorBand"

// A straight corridor the explorer stands at one end of: cell [0,1] is a step away, [0,9] is far.
const corridor: GridCell = { type: "corridor", dirs: new Set(["w", "e"]), state: "reachable" }
const grid: FloorGrid = {
  cells: [Array.from({ length: 10 }, () => corridor)],
  rows: 1,
  cols: 10,
  entrancePos: [0, 0],
  exitPos: [0, 9],
  siteId: "test-site",
  staircases: {},
}

const compassHit = (over: Partial<CompassHit> = {}): CompassHit =>
  ({
    journeyId: "j1",
    levelIdx: 0,
    floorIdx: 0,
    hieroglyphId: "h1",
    pieceIndex: 0,
    access: "open",
    ...over,
  }) as CompassHit

const consumableHit = (over: Partial<ConsumableResult> = {}): ConsumableResult => ({
  journeyId: "j1",
  edgeId: "0:0,1",
  floorIdx: 0,
  cell: { row: 0, col: 1 },
  ...over,
})

const band = (
  activeDetector: DetectorMode,
  over: {
    levels?: Partial<{ compass: number; supplies: number; corridor: number }>
    corridors?: Partial<CorridorDetection>
    compassResults?: CompassHit[]
    consumableResults?: ConsumableResult[]
  } = {}
) => {
  const detector = {
    activeDetector,
    compassResults: over.compassResults ?? [],
    consumableResults: over.consumableResults ?? [],
  } as unknown as DetectorAPI
  const { result } = renderHook(() =>
    useDetectorBand({
      detector,
      levels: { compass: 3, supplies: 3, corridor: 3, ...over.levels },
      corridors: { nearby: false, onThisFloor: false, onOtherFloor: false, ...over.corridors },
      grid,
      explorerPos: [0, 0],
      journeyId: "j1",
      currentFloor: 0,
      currentLevelIdx: 0,
    })
  )
  return result.current
}

describe("useDetectorBand", () => {
  it("shows nothing while no detector is running", () => {
    expect(band(null, { compassResults: [compassHit({ cell: { row: 0, col: 1 } })] })).toBe("none")
  })

  it("pulses fastest for a hit the player is a few steps from", () => {
    expect(band("compass", { compassResults: [compassHit({ cell: { row: 0, col: 1 } })] })).toBe("near")
  })

  it("reports the floor for a hit on it that's too far to be called close", () => {
    expect(band("compass", { compassResults: [compassHit({ cell: { row: 0, col: 9 } })] })).toBe("floor")
  })

  it("reports another pyramid of the journey as a pyramid away, not as this floor", () => {
    expect(band("compass", { compassResults: [compassHit({ levelIdx: 4, cell: { row: 0, col: 1 } })] })).toBe("pyramid")
  })

  it("keeps a low-level compass at pyramid precision however close the hit physically is", () => {
    const hits = [compassHit({ cell: { row: 0, col: 1 } })]
    expect(band("compass", { levels: { compass: 1 }, compassResults: hits })).toBe("pyramid")
  })

  it("gives a mid-level compass the floor but never the exact cell", () => {
    const hits = [compassHit({ cell: { row: 0, col: 1 } })]
    expect(band("compass", { levels: { compass: 2 }, compassResults: hits })).toBe("floor")
  })

  it("reads a skipped chest a few steps away as close", () => {
    expect(band("consumable", { consumableResults: [consumableHit()] })).toBe("near")
  })

  it("folds the corridor detector's own scopes straight onto the dot", () => {
    expect(band("hiddenPassageway", { corridors: { nearby: true } })).toBe("near")
    expect(band("hiddenPassageway", { corridors: { onThisFloor: true } })).toBe("floor")
    expect(band("hiddenPassageway", { corridors: { onOtherFloor: true } })).toBe("pyramid")
  })

  it("stays dark when the running detector has found nothing at all", () => {
    expect(band("compass", { compassResults: [] })).toBe("none")
  })
})
