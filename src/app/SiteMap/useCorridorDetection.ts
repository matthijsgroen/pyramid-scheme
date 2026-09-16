import { useEffect, useMemo } from "react"
import type { FloorGrid } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { isAnyCellWithinSteps } from "./cellProximity"

type CorridorDetectionArgs = {
  journeys: JourneyAPI
  journeyId: string
  currentFloor: number
  /** Corridor detector level the player owns; 0 = no detector. */
  detectorLevel: number
  grid: FloorGrid | null
  explorerPos: readonly [number, number]
  hiddenSections: ReadonlySet<string>
  junctionSections: ReadonlyMap<string, ReadonlySet<string>>
  foundCorridors: ReadonlySet<string>
}

export type CorridorDetection = {
  /** L1: a lead within a few steps of where the player stands. */
  nearby: boolean
  /** L2: this floor still holds a corridor the player hasn't noticed. */
  onThisFloor: boolean
  /** L3: an unnoticed corridor waits on a floor other than this one. */
  onOtherFloor: boolean
}

// The corridor detector's world model (§7.2): which hidden corridors are known, which are found,
// and what the readout says at each level.
//
// Known vs. found: every floor the player views makes its hidden corridors "known"; standing on a
// hidden junction (detector-forced reachable at L1) marks the corridor it borders "found".
// Outstanding = known \ found is what the L2/L3 markers read.
export const useCorridorDetection = ({
  journeys,
  journeyId,
  currentFloor,
  detectorLevel,
  grid,
  explorerPos,
  hiddenSections,
  junctionSections,
  foundCorridors,
}: CorridorDetectionArgs): CorridorDetection => {
  const hiddenSectionKey = useMemo(() => [...hiddenSections].sort().join(","), [hiddenSections])
  useEffect(() => {
    if (hiddenSectionKey) journeys.registerHiddenCorridors(hiddenSectionKey.split(","))
    // journeys is a fresh object each render; the reducer no-ops when nothing is added, so keying the
    // effect on the stable hash string (not journeys) is what stops a write loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenSectionKey, journeyId, currentFloor])
  useEffect(() => {
    if (detectorLevel < 1) return
    const bordered = junctionSections.get(`${explorerPos[0]},${explorerPos[1]}`)
    if (bordered) for (const hash of bordered) journeys.markCorridorFound(hash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerPos, junctionSections, detectorLevel])

  const onThisFloor = useMemo(
    () => [...hiddenSections].some(h => !foundCorridors.has(h)),
    [hiddenSections, foundCorridors]
  )
  // Recomputed as the player walks, so the readout flips from "nothing nearby" to "something nearby"
  // on approach.
  const nearby = useMemo(
    () => isAnyCellWithinSteps(grid, explorerPos, new Set(junctionSections.keys())),
    [grid, explorerPos, junctionSections]
  )
  // Still-unnoticed corridors on OTHER floors. The pyramid tally counts every floor the player has
  // viewed, this floor included, so subtracting this floor's own outstanding leaves the ones worth
  // travelling for. Only visited floors count — an unvisited floor's corridors are not "known", which
  // is deliberate: a corridor behind a door the player cannot open yet would otherwise send them
  // hunting for something unreachable.
  const floorOutstanding = useMemo(
    () => [...hiddenSections].filter(h => !foundCorridors.has(h)).length,
    [hiddenSections, foundCorridors]
  )
  const onOtherFloor = journeys.getOutstandingHiddenCorridorCount(journeyId) - floorOutstanding > 0

  return { nearby, onThisFloor, onOtherFloor }
}
