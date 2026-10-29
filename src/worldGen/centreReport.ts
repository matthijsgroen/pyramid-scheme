import { decorationFootprint, type DecorationKind, type PropFootprint } from "@/game/siteTypes"
import { centreFallbacks, growsAt } from "@/game/carve/growRooms"
import { difficulties as TIERS, type Difficulty } from "@/data/difficultyLevels"
import type { CarveFinalFloor } from "./layoutCheck"
import type { SiteConfig } from "./types"
import type { FloorConfig as GameFloorConfig } from "@/game/siteTypes"

export type CentreTally = { stood: number; fellBack: number }

/** Per tier, the centre objects of the final world's floors in rooms that may grow (`growsAt`): those that stood (their
 * room grew) and those that fell back to one cell. The tier is the floor's `difficulty`. */
export const centreFallbacksByTier = (
  configs: Record<string, SiteConfig[]>,
  carveFinal: CarveFinalFloor,
  footprintOf: (kind: DecorationKind) => PropFootprint = decorationFootprint
): Record<Difficulty, CentreTally> => {
  const tally = Object.fromEntries(TIERS.map(tier => [tier, { stood: 0, fellBack: 0 }])) as Record<
    Difficulty,
    CentreTally
  >
  for (const [journeyId, sites] of Object.entries(configs))
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        const grid = carveFinal(journeyId, siteIdx + 1, floorIndex, floor as GameFloorConfig)
        if (!grid) return
        const fellBack = centreFallbacks(grid, footprintOf).length
        const wanted = grid.cells.flat().filter(cell => growsAt(cell, footprintOf)).length
        tally[floor.difficulty].fellBack += fellBack
        tally[floor.difficulty].stood += wanted - fellBack
      })
    )
  return tally
}

export const describeCentreTally = (tally: Record<Difficulty, CentreTally>): string =>
  `  Centre objects: ${TIERS.map(tier => `${tier} ${tally[tier].stood} stood, ${tally[tier].fellBack} fell back`).join(", ")}`
