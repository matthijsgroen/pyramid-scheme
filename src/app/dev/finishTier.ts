import { difficultyCompare, wardKeyDifficulty, type Difficulty } from "@/data/difficultyLevels"
import type { Journey } from "@/data/journeys"
import type { Direction, FloorGrid, TreasureReward } from "@/game/siteTypes"
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
 * floor they can walk to explored, and each reward lying on a cell that was not explored yet claimed. A cell already
 * explored was claimed when it was, so finishing twice claims nothing twice, and a journey of another tier is never
 * touched. A ward gate sealed by a later tier's key stands shut, so what lies past it, the floors down its stair
 * included, stays fogged.
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
      const grids = Array.from({ length: floorCount }, (_, floorIndex) => floorOf(levelNr, floorIndex))
      const walkable = walkableCells(grids, tier)
      for (let floorIndex = 0; floorIndex < floorCount; floorIndex++) {
        const grid = grids[floorIndex]
        if (!grid) continue
        floors.push({ journeyId: journey.id, levelNr, floorIndex, grid })
        grid.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (!walkable[floorIndex].has(`${r},${c}`)) return
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

const STEPS: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** Per floor of one level, the cells (`r,c`) a player who finished `tier` can walk to: from floor 0's entrance, and
 * onto another floor by a stair reached on one already walked. A ward gate whose key is of a later tier is not passed. */
const walkableCells = (grids: (FloorGrid | null)[], tier: Difficulty): Set<string>[] => {
  const walkable = grids.map(() => new Set<string>())
  const reachedStairs = new Set<string>()
  const shut = (keyId: string | undefined) => {
    const keyTier = wardKeyDifficulty(keyId)
    return keyTier === undefined || difficultyCompare(keyTier, tier) > 0
  }
  const walk = (floor: number, grid: FloorGrid, [r0, c0]: readonly [number, number]) => {
    const queue: [number, number][] = [[r0, c0]]
    while (queue.length > 0) {
      const [r, c] = queue.shift()!
      const cell = grid.cells[r]?.[c]
      if (!cell || cell.type === "empty" || walkable[floor].has(`${r},${c}`)) continue
      if (cell.type === "room" && cell.gateVariant === "tomb-key" && shut(cell.requiredKeyId)) continue
      walkable[floor].add(`${r},${c}`)
      for (const [stairId, [sr, sc]] of Object.entries(grid.staircases ?? {}))
        if (sr === r && sc === c) reachedStairs.add(stairId)
      for (const dir of cell.dirs) queue.push([r + STEPS[dir][0], c + STEPS[dir][1]])
    }
  }
  if (grids[0]) walk(0, grids[0], grids[0].entrancePos)
  for (let grew = true; grew;) {
    grew = false
    grids.forEach((grid, floor) => {
      if (!grid) return
      for (const [stairId, at] of Object.entries(grid.staircases ?? {})) {
        if (!reachedStairs.has(stairId) || walkable[floor].has(`${at[0]},${at[1]}`)) continue
        walk(floor, grid, at)
        grew ||= walkable[floor].has(`${at[0]},${at[1]}`)
      }
    })
  }
  return walkable
}
