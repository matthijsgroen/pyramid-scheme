import { useMemo } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"

// The ways out this journey's switches currently leave open — fed to useAssembledFloor, where the door
// each id names gives the floor back the corridor it was cut from.
//
// Keyed on a stable content string rather than on the journeys object, for the same reason
// useFoundCorridors is: getOpenWaysOut builds a fresh Set every render, and an unstable set identity
// would re-carve the floor on every one of them.
export const useOpenWaysOut = (journeys: JourneyAPI, journeyId: string): ReadonlySet<string> => {
  const openKey = [...journeys.getOpenWaysOut(journeyId)].sort().join(",")
  return useMemo(() => new Set(openKey ? openKey.split(",") : []), [openKey])
}
