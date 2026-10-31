import { use, useMemo } from "react"
import { DevelopContext } from "@/contexts/DevelopMode"
import { useMergedHeldKeys } from "@/app/SiteMap/keyProviders"
import { useJourneys } from "@/app/state/useJourneys"
import type { Journey } from "@/data/journeys"
import { useMergedGateNeeds } from "./gateNeeds"
import { availablePyramidJourneyIds } from "./journeyAvailability"

// Which pyramid expeditions the player may pick: the tier ladder, with develop mode opening every one of
// them (the within-tier "previous pyramid completed" rule can't be met by granting anything, and faking
// completionCount would flip journeys into revisit mode).
export const useAvailableJourneyIds = (journeys: readonly Journey[]): ReadonlySet<string> => {
  const { getJourney } = useJourneys()
  const heldKeys = useMergedHeldKeys()
  const gateNeeds = useMergedGateNeeds()
  const { isDevelopMode } = use(DevelopContext)
  return useMemo(
    () =>
      isDevelopMode
        ? new Set(journeys.filter(j => !j.entryLock).map(j => j.id))
        : availablePyramidJourneyIds(
            journeys,
            heldKeys,
            id => (getJourney(id)?.completionCount ?? 0) > 0,
            undefined,
            tier => gateNeeds.open({ tier }, heldKeys)
          ),
    [journeys, heldKeys, getJourney, isDevelopMode, gateNeeds]
  )
}
