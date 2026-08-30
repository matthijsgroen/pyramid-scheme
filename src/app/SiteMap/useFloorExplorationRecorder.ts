import { useEffect, useMemo, useRef } from "react"
import type { FloorGrid } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { computeFloorExploration } from "./floorExploration"

type RecorderArgs = {
  journeys: JourneyAPI
  journeyId: string
  /** Which level of the journey this site is — the same address its rooms draw their boards by. */
  levelNr: number
  currentFloor: number
  grid: FloorGrid | null
}

// Persists the per-floor "still stuff to find here" summary the Travel marker reads. The pure
// classification (loot nodes / key-gated nodes / fogged corridors, keys-and-gates only, no mod names)
// lives in floorExploration.ts and is unit-tested there.
//
// Written when the player LEAVES the floor (switches floor or exits the interior), from a ref in the
// cleanup — NOT reactively on every grid change. A reactive write fed a render loop: writing
// re-rendered the screen, the grid recomputed (getExploredSections returns a fresh object each
// render, so useAssembledFloor rebuilds), and the effect could re-fire while the exit chamber was
// mid-reveal, pegging the CPU (flicker, input starvation). Recording on-leave captures the floor's
// final state — exactly what "still stuff to find" means — and can never re-enter render.
export const useFloorExplorationRecorder = ({
  journeys,
  journeyId,
  levelNr,
  currentFloor,
  grid,
}: RecorderArgs): void => {
  const floorExploration = useMemo(() => (grid ? computeFloorExploration(grid) : null), [grid])
  const floorExplorationRef = useRef(floorExploration)
  // Kept in an effect, NOT assigned during render: a staircase renders the floor the player arrived on
  // before the leaving effect's cleanup runs, so a ref written in render already holds the NEW floor's
  // summary by the time the OLD floor is recorded. A floor just entered is all fog, so every floor left
  // behind was filed as "still stuff to find here" and its pyramid kept pulsing on the map until a
  // second visit re-stamped it. Cleanups run before any effect body, so this only ever moves on once
  // the floor being left has been written.
  useEffect(() => {
    floorExplorationRef.current = floorExploration
  }, [floorExploration])
  // Latest register fn (journeyId passed explicitly, so it records even after the journey goes
  // inactive on completion — the interior unmounts right after completeJourney).
  // The level is named here rather than looked up when the write lands: this one fires as the interior
  // unmounts, and by then the journey's own levelNr may already have moved on to the next pyramid.
  const recordExploration = useRef<(floor: number, open: boolean, keySets: string[][]) => void>(() => {})
  recordExploration.current = (floor, open, keySets) =>
    journeys.registerFloorExploration(journeyId, levelNr, floor, open, keySets)
  useEffect(() => {
    const floor = currentFloor
    return () => {
      const fe = floorExplorationRef.current
      if (fe) recordExploration.current(floor, fe.open, fe.keySets)
    }
  }, [currentFloor, journeyId])
}
