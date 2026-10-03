import { useEffect, useRef } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { assemblerFor } from "./useCarveIndependentBackfill"
import { backfillMechanismSlots } from "./backfillMechanismSlots"

/**
 * Copies a save's mechanism state and explored mechanism rooms from the address they were filed under
 * before a mechanism's slot named the mechanism to the one it has now, once, on the first launch that
 * has this code (`mechanismSlotVersion`). Until it has run the readers fall back to the old address, so
 * nothing waits on it. Only the floors the save already names are assembled, after mount.
 */
export const useMechanismSlotBackfill = (journeys: JourneyAPI) => {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const outstanding = journeys.journeysNeedingMechanismSlots()
    if (!outstanding.length) return
    done.current = true
    for (const stored of outstanding)
      journeys.setMechanismSlotBackfill(
        stored.journeyId,
        backfillMechanismSlots(stored, assemblerFor(stored.journeyId))
      )
  }, [journeys])
}
