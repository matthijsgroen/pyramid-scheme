import { useMemo } from "react"
import type { FloorGrid } from "@/game/siteTypes"
import type { DetectorAPI } from "@/app/state/useDetector"
import type { MergedDetectorLevels } from "./detectorLevels"
import type { CorridorDetection } from "./useCorridorDetection"
import { isAnyCellWithinSteps } from "./cellProximity"
import { bandFromHits, corridorBand, type ProximityBand } from "./detectorProximity"

type DetectorBandArgs = {
  detector: DetectorAPI
  levels: MergedDetectorLevels
  corridors: CorridorDetection
  grid: FloorGrid | null
  explorerPos: readonly [number, number]
  journeyId: string
  currentFloor: number
  /** 0-based index of the pyramid being explored, for telling this one from the rest of the journey. */
  currentLevelIdx: number
}

// How close the running detector's nearest reading is, for the pulsing dot beside the HUD button.
// Each detector is narrowed to what its own level may know (see detectorProximity) — the dot must not
// hand the player L3 precision at L1.
//
// A hit's pyramid: CompassHit carries levelIdx, so a hit elsewhere in this journey is correctly
// "another pyramid" rather than this floor. ConsumableResult carries no levelIdx (it is rebuilt from
// an edgeId), so supplies can only match journey + floor index — a skipped chest on floor 2 of a
// DIFFERENT pyramid of the same journey reads as "this floor". Same limitation the supplies readout
// already has in its labels; fixing it means recording the pyramid when the skip is stored.
export const useDetectorBand = ({
  detector,
  levels,
  corridors,
  grid,
  explorerPos,
  journeyId,
  currentFloor,
  currentLevelIdx,
}: DetectorBandArgs): ProximityBand =>
  useMemo((): ProximityBand => {
    if (detector.activeDetector === "hiddenPassageway") return corridorBand(levels.corridor, corridors)

    // One search for the whole floor rather than one per hit: `bandFromHits` only asks whether ANY hit
    // is close, so "is any of these cells within reach" is a single walk outward.
    const anyNearby = (cells: readonly { row: number; col: number }[]) =>
      isAnyCellWithinSteps(grid, explorerPos, new Set(cells.map(c => `${c.row},${c.col}`)))

    if (detector.activeDetector === "compass") {
      const here = detector.compassResults.filter(
        r => r.journeyId === journeyId && r.levelIdx === currentLevelIdx && r.floorIdx === currentFloor
      )
      const close = anyNearby(here.flatMap(r => (r.cell ? [r.cell] : [])))
      return bandFromHits(
        levels.compass,
        detector.compassResults.map(r => ({ onThisFloor: here.includes(r), nearby: here.includes(r) && close }))
      )
    }
    if (detector.activeDetector === "consumable") {
      const here = detector.consumableResults.filter(r => r.journeyId === journeyId && r.floorIdx === currentFloor)
      const close = anyNearby(here.map(r => r.cell))
      return bandFromHits(
        levels.supplies,
        detector.consumableResults.map(r => ({ onThisFloor: here.includes(r), nearby: here.includes(r) && close }))
      )
    }
    return "none"
  }, [
    detector.activeDetector,
    detector.compassResults,
    detector.consumableResults,
    levels,
    corridors,
    grid,
    explorerPos,
    journeyId,
    currentFloor,
    currentLevelIdx,
  ])
