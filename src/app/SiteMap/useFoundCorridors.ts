import { useMemo } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"

// The hidden corridors this journey has already noticed (§7.2) — fed to useAssembledFloor as
// revealedSections, where a found corridor unmasks: its cells become walkable and its optional loot
// collectible.
//
// Keyed on a stable content string rather than on the journeys object: getFoundHiddenCorridors
// returns a fresh Set every render, and an unstable set identity rebuilds the masked grid on every
// render — the churn that let the found-marking effect re-fire mid-reveal.
export const useFoundCorridors = (journeys: JourneyAPI, journeyId: string): ReadonlySet<string> => {
  const foundKey = [...journeys.getFoundHiddenCorridors(journeyId)].sort().join(",")
  return useMemo(() => new Set(foundKey ? foundKey.split(",") : []), [foundKey])
}
