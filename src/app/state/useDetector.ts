import { useMemo, useState } from "react"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { FloorConfig } from "@/game/siteTypes"
import type { ProgressionAPI } from "./useProgression"
import type { JourneyAPI } from "./useJourneys"

export type DetectorMode = "compass" | "consumable" | "hiddenPassageway" | null

export type CompassResult = {
  journeyId: string
  levelIdx: number
  floorIdx: number
  hieroglyphId: string
  pieceIndex: number
}

export type ConsumableResult = {
  journeyId: string
  edgeId: string
}

export type DetectorAPI = {
  activeDetector: DetectorMode
  compassTarget: string | null
  setDetector: (mode: DetectorMode) => void
  setCompassTarget: (hieroglyphId: string) => void
  compassResults: CompassResult[]
  consumableResults: ConsumableResult[]
}

const scanFloorForFragments = (floor: FloorConfig, hieroglyphId: string): { pieceIndex?: number }[] => {
  const results: { pieceIndex?: number }[] = []
  const checkReward = (r: FloorConfig["mainEndReward"]) => {
    if (r?.type === "hieroglyphFragment" && r.hieroglyphId === hieroglyphId) {
      results.push({ pieceIndex: r.pieceIndex })
    }
  }
  checkReward(floor.mainEndReward)
  for (const chest of floor.chestRewards ?? []) {
    if (chest.type === "hieroglyphFragment" && chest.hieroglyphId === hieroglyphId) {
      results.push({ pieceIndex: chest.pieceIndex })
    }
  }
  for (const section of floor.sideSections ?? []) {
    checkReward(section.endReward)
  }
  return results
}

export const useDetector = (progression: ProgressionAPI, journeys: JourneyAPI): DetectorAPI => {
  const [activeDetector, setActiveDetector] = useState<DetectorMode>(null)
  const [compassTarget, setCompassTarget] = useState<string | null>(null)

  const compassResults = useMemo((): CompassResult[] => {
    if (activeDetector !== "compass" || !compassTarget) return []
    const results: CompassResult[] = []
    for (const [journeyId, levels] of Object.entries(generatedWorldConfigs)) {
      levels.forEach((floors, levelIdx) => {
        floors.forEach((floor, floorIdx) => {
          for (const found of scanFloorForFragments(floor, compassTarget)) {
            if (found.pieceIndex !== undefined && !progression.hasFragment(compassTarget, found.pieceIndex)) {
              results.push({ journeyId, levelIdx, floorIdx, hieroglyphId: compassTarget, pieceIndex: found.pieceIndex })
            }
          }
        })
      })
    }
    return results
  }, [activeDetector, compassTarget, progression])

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
