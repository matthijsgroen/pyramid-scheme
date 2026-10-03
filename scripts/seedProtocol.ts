import type { Difficulty } from "../src/data/difficultyLevels"
import type { FamilyGenerationCtx } from "../src/game/families/familyMeta"
import type { FoundSeed } from "../src/game/seeds/findSeeds"

/** One range of seeds to scan for one bucket. Ranges are disjoint, and what they find counts in whatever
 * order it lands. */
export type SeedTask = {
  taskId: number
  hash: string
  familyId: string
  difficulty: Difficulty
  /** What this bucket hands its generator — the whole of it, since a family may key its list on more
   * than the tier. */
  ctx: FamilyGenerationCtx
  from: number
  count: number
}

export type SeedWorkerMessage =
  { type: "result"; taskId: number; found: FoundSeed[]; error?: string } | { type: "idle" }
