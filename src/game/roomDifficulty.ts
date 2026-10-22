import type { Difficulty } from "@/data/difficultyLevels"

/** The difficulty one room of a chain is built at: its node's own, else the section's (a floor is a section
 * here too). Every per-room reader goes through this so a node that names a difficulty is dealt, bucketed,
 * tiered and generated at it everywhere at once. */
export const roomDifficulty = (
  section: { difficulty: Difficulty; difficultiesByIndex?: Record<number, Difficulty> },
  index: number
): Difficulty => section.difficultiesByIndex?.[index] ?? section.difficulty
