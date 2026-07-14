import { useCallback } from "react"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { CompassResult, FloorConfig } from "@/game/siteTypes"
import type { CompassScanner } from "@/app/SiteMap/detectorScanners"
import { useHieroglyphProgress } from "./useHieroglyphProgress"

const scanFloorForFragments = (floor: FloorConfig, hieroglyphId: string): number[] => {
  const results: number[] = []
  const checkReward = (r: FloorConfig["mainEndReward"]) => {
    if (r?.type === "hieroglyphFragment" && r.hieroglyphId === hieroglyphId && r.pieceIndex !== undefined) {
      results.push(r.pieceIndex)
    }
  }
  checkReward(floor.mainEndReward)
  for (const section of floor.sideSections ?? []) checkReward(section.endReward)
  return results
}

// The hieroglyph mod's compass scanner: every world location of the target hieroglyph's fragment
// pieces the player hasn't collected yet. Registered from the mod's app entrypoint, so core's
// detector surfaces compass hits without naming `hieroglyphFragment`. hieroglyph off → not
// registered → the compass yields nothing.
export const useHieroglyphCompassScanner = (): CompassScanner => {
  const { hasFragment } = useHieroglyphProgress()
  return useCallback(
    (target: string): CompassResult[] => {
      const results: CompassResult[] = []
      for (const [journeyId, levels] of Object.entries(generatedWorldConfigs)) {
        levels.forEach((floors, levelIdx) => {
          floors.forEach((floor, floorIdx) => {
            for (const pieceIndex of scanFloorForFragments(floor, target)) {
              if (!hasFragment(target, pieceIndex)) {
                results.push({ journeyId, levelIdx, floorIdx, hieroglyphId: target, pieceIndex })
              }
            }
          })
        })
      }
      return results
    },
    [hasFragment]
  )
}
