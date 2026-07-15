import { useCallback } from "react"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { CompassResult, FloorConfig } from "@/game/siteTypes"
import type { CompassScanner } from "@/app/SiteMap/detectorScanners"
import { useHieroglyphProgress } from "./useHieroglyphProgress"
import { hieroglyphFragmentSchema } from "./rewardSchema"

const scanFloorForFragments = (floor: FloorConfig, hieroglyphId: string): number[] => {
  const results: number[] = []
  const checkReward = (r: FloorConfig["mainEndReward"]) => {
    if (r?.type !== "hieroglyphFragment") return
    const fragment = hieroglyphFragmentSchema.parse(r)
    if (fragment.hieroglyphId === hieroglyphId) results.push(fragment.pieceIndex)
  }
  // Fragments live under two node-reward names: the path-end `endReward` AND every `rewards[]`
  // entry (a shop node bakes its stock there). Scan both, or the compass can't point at a shop
  // that sells a fragment — the ownership-skip below then drops it once bought. Mirrors the
  // gen-side forEachReward sweep (validate.ts).
  const scan = (s: { endReward?: FloorConfig["mainEndReward"]; rewards?: FloorConfig["mainEndReward"][] }) => {
    checkReward(s.endReward)
    for (const r of s.rewards ?? []) checkReward(r)
  }
  checkReward(floor.mainEndReward)
  for (const r of floor.rewards ?? []) checkReward(r)
  for (const section of floor.sideSections ?? []) {
    scan(section)
    for (const sub of section.sideSections ?? []) scan(sub)
  }
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
