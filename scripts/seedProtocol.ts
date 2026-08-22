import type { Difficulty } from "../src/data/difficultyLevels"
import type { FoundSeed } from "../src/game/seeds/findSeeds"

/** One window of seeds to scan for one bucket. Windows are disjoint and indexed in order. */
export type SeedTask = {
  taskId: number
  hash: string
  familyId: string
  difficulty: Difficulty
  /** Which window of this bucket's space, counted from zero — the order results are retired in. */
  chunk: number
  from: number
  count: number
}

export type SeedWorkerMessage =
  { type: "result"; taskId: number; found: FoundSeed[]; error?: string } | { type: "idle" }
