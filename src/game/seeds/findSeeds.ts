import type { FamilyOptions, Grade, SeedableFamily } from "@/game/families/familyMeta"

/** A seed that earned its place on a list, with what solving it taught the pass. */
export type FoundSeed = { seed: number; grade: Grade }

/**
 * Tests a window of seeds and keeps the ones a family would ship (`docs/instructions/puzzle-screens.md` §6.1).
 *
 * A seed is admitted only when its **first** attempt builds a board the family's own `grade` accepts.
 * Insisting on the first attempt is what lets play time run one attempt with no gates at all: the board
 * a listed seed produces is the board that was verified, with no search in between deciding which draft
 * wins.
 *
 * A window is a plain range and every seed in it is judged alone, so which thread scans which window, and
 * in what order the results land, cannot change whether a seed is admitted.
 */
export const findSeeds = (
  seedable: SeedableFamily,
  options: FamilyOptions,
  from: number,
  count: number
): FoundSeed[] => {
  const found: FoundSeed[] = []
  for (let seed = from; seed < from + count; seed++) {
    let board
    try {
      board = seedable.generate(seed, options, 1)
    } catch {
      continue // the one attempt it was given missed
    }
    const grade = seedable.grade(board, options)
    if (grade) found.push({ seed, grade })
  }
  return found
}
