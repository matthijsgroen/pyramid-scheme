import { useMemo, useState } from "react"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { DetectorMode, CompassResult, ConsumableResult } from "@/game/siteTypes"
import type { JourneyAPI } from "./useJourneys"
import { useMergedCompassScanner } from "@/app/SiteMap/detectorScanners"
import { useCompassTarget } from "@/app/SiteMap/compassTarget"
import { decodeEdge } from "@/app/SiteMap/useAssembledFloor"

export type DetectorAPI = {
  activeDetector: DetectorMode
  compassTarget: string | null
  setDetector: (mode: DetectorMode) => void
  compassResults: CompassResult[]
  consumableResults: ConsumableResult[]
}

export const useDetector = (journeys: JourneyAPI): DetectorAPI => {
  const [activeDetector, setActiveDetector] = useState<DetectorMode>(null)
  // The hunt target is picked on Collection and owned by the fragment mod (§3C); core reads it via
  // the seam (null when no mod owns it) so a target survives navigation into a site.
  const compassTarget = useCompassTarget()
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
        // edgeId encodes "floor:row,col" — decode so the panel can narrow the readout by level (§7.2).
        const [floorIdx, row, col] = decodeEdge(edgeId)
        results.push({ journeyId, edgeId, floorIdx, cell: { row, col } })
      }
    }
    return results
  }, [activeDetector, journeys])

  return {
    activeDetector,
    compassTarget,
    setDetector: setActiveDetector,
    compassResults,
    consumableResults,
  }
}
