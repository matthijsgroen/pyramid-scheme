import { useMemo } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"
import type { SequenceRead } from "@/game/sequenceReads"

/** What play keeps beside every sequence on this level that hides its order, stable by content so a re-render does
 * not re-carve the floor. Keyed by the sequence's cell address, as its position is. */
export const useSequenceReads = (journeys: JourneyAPI, journeyId: string): ReadonlyMap<string, SequenceRead> => {
  const key = JSON.stringify([...journeys.getSequenceReads(journeyId)].sort(([a], [b]) => a.localeCompare(b)))
  return useMemo(() => new Map(JSON.parse(key) as [string, SequenceRead][]), [key])
}
