import { useEffect, useRef } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { assemblerFor } from "./useCarveIndependentBackfill"
import { repairFloorExploration } from "./repairFloorExploration"

/**
 * Mends a save's exploration record and recomputes its floor summaries from it, once, on the first
 * launch that has this code (`floorExplorationVersion`).
 *
 * It must not wait for a visit: the marker exists to decide whether that visit is worth making.
 *
 * Only the floors the save already names are assembled, after mount, so it never blocks first paint.
 */
export const useFloorExplorationBackfill = (journeys: JourneyAPI) => {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const outstanding = journeys.journeysNeedingFloorRederive()
    if (!outstanding.length) return
    done.current = true
    for (const stored of outstanding) {
      journeys.setRepairedExploration(stored.journeyId, repairFloorExploration(stored, assemblerFor(stored.journeyId)))
    }
  }, [journeys])
}
