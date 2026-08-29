import type { Difficulty } from "../src/data/difficultyLevels"
import type { FoundSeed } from "../src/game/seeds/findSeeds"

/** One range of seeds to scan for one bucket. Ranges are disjoint, and what they find counts in whatever
 * order it lands. */
export type SeedTask = {
  taskId: number
  hash: string
  familyId: string
  difficulty: Difficulty
  from: number
  count: number
}

export type SeedWorkerMessage =
  { type: "result"; taskId: number; found: FoundSeed[]; error?: string } | { type: "idle" }
