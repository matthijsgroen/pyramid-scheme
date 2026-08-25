import { describe, expect, it } from "vitest"
import { SUDOKU_META } from "./meta"
import { SUDOKU_CONFIG } from "./sudokuConfig"
import { solveSudokuByTechniques } from "./techniques"
import { techniquesFor } from "./demands"
import type { SudokuPuzzle } from "./generateSudoku"
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { configHash } from "@/game/seeds/configHash"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { difficulties } from "@/data/difficultyLevels"

/**
 * The seam a room and the puzzle lab actually build a board through
 * (`docs/instructions/puzzle-screens.md` §6.1) — not the generator underneath it.
 *
 * **This family is held back from the world on purpose** (`src/mods/puzzle/index.ts`), so no room asks
 * for it, so it has no seed lists, so every board it builds takes the miss path and searches live. That
 * is the documented fallback and it is also, for now, the ONLY way this family is ever played. Nothing
 * else covers it: the generator's own spec calls `generateSudoku` directly and would stay green while
 * the seam above it was broken.
 */
describe("building a sudoku board the way a room does", () => {
  it("has no seed list, which is what makes the rest of this file worth running", () => {
    const listed = difficulties.map(
      difficulty => puzzleSeeds[configHash(SUDOKU_META.seedable!.resolveOptions({ difficulty }))]?.length ?? 0
    )
    expect(listed).toEqual(difficulties.map(() => 0))
  })

  it.each(difficulties)(
    "builds a solvable %s board live, with no list to draw on",
    difficulty => {
      const board = generatePuzzle<SudokuPuzzle>(SUDOKU_META, 123456, { difficulty })
      const solved = solveSudokuByTechniques(board, techniquesFor(board.techniqueCap))
      expect(solved.settled).toBe(true)
      expect(solved.values).toEqual(board.solution)
      expect(board.techniqueCap).toBe(SUDOKU_CONFIG[difficulty].techniqueCap)
    },
    30_000
  )

  it("gives a room the same board every time it is opened", () => {
    // The lab rerolls by changing the seed, and a real room's seed is a hash of its own identity — so a
    // board has to be a function of that seed and nothing else, list or no list.
    const built = () => generatePuzzle<SudokuPuzzle>(SUDOKU_META, 4242, { difficulty: "expert" })
    expect(built()).toEqual(built())
  }, 30_000)
})
