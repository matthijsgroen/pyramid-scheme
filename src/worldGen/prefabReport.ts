import { difficulties as TIERS, type Difficulty } from "@/data/difficultyLevels"
import type { FloorConfig as GameFloorConfig } from "@/game/siteTypes"
import type { CarveFinalFloor } from "./layoutCheck"
import type { SiteConfig } from "./types"

export type PrefabTally = { placed: number; pinned: number }

/** Per tier, the prefab rooms laid on the final world's floors, and how many of them a node pinned. The tier is the
 * floor's `difficulty`. */
export const prefabTallyByTier = (
  configs: Record<string, SiteConfig[]>,
  carveFinal: CarveFinalFloor
): Record<Difficulty, PrefabTally> => {
  const tally = Object.fromEntries(TIERS.map(tier => [tier, { placed: 0, pinned: 0 }])) as Record<
    Difficulty,
    PrefabTally
  >
  for (const [journeyId, sites] of Object.entries(configs))
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        const grid = carveFinal(journeyId, siteIdx + 1, floorIndex, floor as GameFloorConfig)
        if (!grid) return
        for (const cell of grid.cells.flat()) {
          if (cell.type === "empty" || !cell.prefabRoom) continue
          tally[floor.difficulty].placed++
          if (cell.type === "room" && cell.pinnedPrefab !== undefined) tally[floor.difficulty].pinned++
        }
      })
    )
  return tally
}

export const describePrefabTally = (tally: Record<Difficulty, PrefabTally>): string =>
  `  Prefab rooms: ${TIERS.map(tier => `${tier} ${tally[tier].placed} placed (${tally[tier].pinned} pinned)`).join(", ")}`
