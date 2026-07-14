import { useMemo, useState } from "react"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { DetectorMode, CompassResult, ConsumableResult } from "@/game/siteTypes"
import type { JourneyAPI } from "./useJourneys"
import { useMergedCompassScanner } from "@/app/SiteMap/detectorScanners"

export type DetectorAPI = {
  activeDetector: DetectorMode
  compassTarget: string | null
  setDetector: (mode: DetectorMode) => void
  setCompassTarget: (hieroglyphId: string) => void
  compassResults: CompassResult[]
  consumableResults: ConsumableResult[]
}

export const useDetector = (journeys: JourneyAPI): DetectorAPI => {
  const [activeDetector, setActiveDetector] = useState<DetectorMode>(null)
  const [compassTarget, setCompassTarget] = useState<string | null>(null)
  const scanCompass = useMergedCompassScanner()

  // Compass scanning is mod-owned (each mod registers a scanner for its own reward type via
  // detectorScanners); core just runs the merged scanner for the current target.
  const compassResults = useMemo<CompassResult[]>(
    () => (activeDetector === "compass" && compassTarget ? scanCompass(compassTarget) : []),
    [activeDetector, compassTarget, scanCompass]
  )

  const consumableResults = useMemo((): ConsumableResult[] => {
    if (activeDetector !== "consumable") return []
    // Returns edgeIds of chests with consumables that were skipped due to full inventory.
    // We surface all journeys' skipped consumables so the player knows where to return.
    const results: ConsumableResult[] = []
    for (const [journeyId] of Object.entries(generatedWorldConfigs)) {
      const skipped = journeys.getSkippedConsumables(journeyId)
      for (const edgeId of skipped) {
        results.push({ journeyId, edgeId })
      }
    }
    return results
  }, [activeDetector, journeys])

  return {
    activeDetector,
    compassTarget,
    setDetector: setActiveDetector,
    setCompassTarget,
    compassResults,
    consumableResults,
  }
}
