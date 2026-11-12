import type { Difficulty } from "@/data/difficultyLevels"
import type { Journey } from "@/data/journeys"
import type { TreasureReward } from "@/game/siteTypes"
import { cellAddress, type AssembleFor } from "@/app/SiteMap/cellIdentity"
import type { JourneyAPI } from "@/app/state/useJourneys"
import type { FinishedFloor, TierFinished } from "./tierFinishContributions"

export type FinishTierArgs = {
  tier: Difficulty
  journeys: readonly Pick<Journey, "id" | "difficulty" | "levelCount" | "siteConfigs">[]
  /** The floors of one journey, carved as play carves them (assemblerFor). */
  assemble: (journeyId: string) => AssembleFor
  progress: Pick<JourneyAPI, "finishJourney" | "exploredAddresses">
  /** Claims one reward found in `journeyId`; false when a mod skipped it. */
  claim: (reward: TreasureReward, journeyId: string) => boolean
}

/**
 * Plays every journey of `tier` to its end the way a player who leaves nothing behind would: each cell of each
 * floor explored, and each reward lying on a cell that was not explored yet claimed. A cell already explored was
 * claimed when it was, so finishing twice claims nothing twice, and a journey of another tier is never touched.
 */
export const finishTier = ({ tier, journeys, assemble, progress, claim }: FinishTierArgs): TierFinished => {
  const floors: FinishedFloor[] = []
  const claimed: TreasureReward[] = []
  for (const journey of journeys.filter(j => j.difficulty === tier)) {
    const done = progress.exploredAddresses(journey.id)
    const floorOf = assemble(journey.id)
    const explored: { levelNr: number; address: string }[] = []
    for (let levelNr = 1; levelNr <= journey.levelCount; levelNr++) {
      const floorCount = journey.siteConfigs?.[levelNr - 1]?.length ?? 0
      for (let floorIndex = 0; floorIndex < floorCount; floorIndex++) {
        const grid = floorOf(levelNr, floorIndex)
        if (!grid) continue
        floors.push({ journeyId: journey.id, levelNr, floorIndex, grid })
        grid.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            const address = cellAddress(grid, floorIndex, r, c)
            if (!address) return
            explored.push({ levelNr, address })
            const reward = cell.type === "room" ? cell.reward : undefined
            if (reward && !done.has(`${levelNr}:${address}`) && claim(reward, journey.id)) claimed.push(reward)
          })
        )
      }
    }
    void progress.finishJourney(journey.id, explored)
  }
  return { tier, floors, claimed }
}
