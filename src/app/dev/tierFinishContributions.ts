import type { Difficulty } from "@/data/difficultyLevels"
import type { FloorGrid, TreasureReward } from "@/game/siteTypes"

/** One floor of a finished tier, carved as play carves it. */
export type FinishedFloor = { journeyId: string; levelNr: number; floorIndex: number; grid: FloorGrid }

/** What finishing a tier did: its floors, and every reward the finish claimed on them. */
export type TierFinished = {
  tier: Difficulty
  floors: readonly FinishedFloor[]
  claimed: readonly TreasureReward[]
}

// What a mod adds to "this tier is finished", beyond the loot core claims through the reward seam: the state
// only its own screens write (a beat heard, a piece set into a window). Core walks the floors and hands the
// result to every part, so it never holds the list of what finishing means to a mod.
export type UseTierFinish = () => (finished: TierFinished) => void

const registry: UseTierFinish[] = []

export const registerTierFinish = (useFinish: UseTierFinish) => registry.push(useFinish)

export const useMergedTierFinish = (): ((finished: TierFinished) => void) => {
  const parts: ((finished: TierFinished) => void)[] = []
  for (const useFinish of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed registry order, set once at module load
    parts.push(useFinish())
  }
  return finished => parts.forEach(part => part(finished))
}
