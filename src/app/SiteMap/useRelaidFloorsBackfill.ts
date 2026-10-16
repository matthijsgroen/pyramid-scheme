import { useEffect, useRef } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { RELAID_PYRAMIDS, standsInRelaidPyramid, type RelaidPyramid } from "./relaidPyramids"

/**
 * Forgets where a save stands when a release has re-laid the pyramid it stands in, once per save, on the first launch
 * that has this code (`relaidFloorsVersion`). A saved place resolves on the new carve, where it can lie past a door
 * the lock has not opened; the save resumes at the entrance instead. Exploration, loot and mechanism states are named
 * by authored address and carry across the re-carve, so nothing else is touched.
 */
export const useRelaidFloorsBackfill = (
  journeys: Pick<JourneyAPI, "journeysNeedingRelaidFloors" | "setRelaidFloors">,
  relaid: readonly RelaidPyramid[] = RELAID_PYRAMIDS
) => {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const outstanding = journeys.journeysNeedingRelaidFloors()
    if (!outstanding.length) return
    done.current = true
    for (const stored of outstanding) journeys.setRelaidFloors(stored.journeyId, standsInRelaidPyramid(stored, relaid))
  }, [journeys, relaid])
}
