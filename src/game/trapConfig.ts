import type { Difficulty } from "@/data/difficultyLevels"

// ponytail: all trap timing lives here — tune before playtesting
export const TRAP_TIME_LIMITS_SECONDS: Record<Difficulty, number> = {
  starter: 0,
  junior: 0,
  expert: 12,
  master: 9,
  wizard: 6,
}

export const TRAP_TIME_EXTENSION_PER_INSIGHT_STACK = 1 // seconds per stack
