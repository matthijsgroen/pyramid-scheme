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
 * Nothing else covers it: the generator's own spec calls `generateSudoku` directly and would stay green
 * while the seam above it was broken. Now that the family is authored into the world
 * (`src/mods/puzzle/index.ts`), rooms draw their boards from the shipped lists, so what this file
 * checks is that the lists are there and that what comes back through the seam is a board a player can
 * actually finish.
 */
describe("building a sudoku board the way a room does", () => {
  it("ships a seed list for every tier a room can ask for", () => {
    const listed = difficulties.map(
      difficulty => puzzleSeeds[configHash(SUDOKU_META.seedable!.resolveOptions({ difficulty }))]?.length ?? 0
    )
    // A miss is never wrong — play time falls back to searching on the device — but a tier that has
    // quietly fallen off the artifact is a tier being generated on a phone, which is what the lists exist
    // to stop.
    expect(listed.filter(count => count === 0)).toEqual([])
  })

  it.each(difficulties)(
    "builds a solvable %s board for a %s room",
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
