import { useEffect, useRef } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { assemblerFor } from "./useCarveIndependentBackfill"
import { repairFloorExploration } from "./repairFloorExploration"

/**
 * Mends a save's exploration record and recomputes its floor summaries from it, once, on the first
 * launch that has this code (`floorExplorationVersion`).
 *
 * IT MUST NOT WAIT FOR A VISIT. The summary is what lights a pyramid on the map, and a summary left
 * over from a visit that never finished lights one the player has already emptied. Correcting it when
 * they next walk in is no correction at all: the walk is the cost the wrong summary imposed, and the
 * marker exists precisely to decide whether that walk is worth making.
 *
 * Only the floors the save already names are assembled — a handful of milliseconds each, once ever,
 * after mount so it never blocks first paint. A save that has been into four floors carves four.
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
