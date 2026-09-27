import { useMemo } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"

/** The positions every mechanism on this journey stands in, stable by content so a re-render does not
 * re-carve the floor. Keyed by the mechanism's cell address. */
export const useMechanismStates = (journeys: JourneyAPI, journeyId: string): ReadonlyMap<string, string> => {
  const entries = [...journeys.getMechanismStates(journeyId)].sort(([a], [b]) => a.localeCompare(b))
  // The memo key is JSON rather than joined strings: a position id is authored, so any separator
  // chosen here could turn up inside a value and two different maps would memo to one key.
  const key = JSON.stringify(entries)
  return useMemo(() => new Map(JSON.parse(key) as [string, string][]), [key])
}
