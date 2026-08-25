import { describe, expect, it } from "vitest"
import { generateSudoku, gradeSudoku, SUDOKU_BOX_HEIGHT, SUDOKU_BOX_WIDTH, SUDOKU_SIZE } from "./generateSudoku"
import { SUDOKU_CONFIG } from "./sudokuConfig"
import { techniquesBelow, techniquesFor } from "./demands"
import { solveSudokuByTechniques, unitsOf } from "./techniques"
import { difficulties } from "@/data/difficultyLevels"
import { configHash } from "@/game/seeds/configHash"

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

const filled = (board: { givens: (number | undefined)[][] }) =>
  board.givens.flat().filter(value => value !== undefined).length

/**
 * The first seed that lands the tier's own rung.
 *
 * Not every seed does — the top tier's is rare on a grid this small, and a miss comes back as the
 * nearest board rather than as nothing — so anything asserting about a tier's REASONING has to ask
 * for a board that graded, which is also the only kind the seed lists carry.
 */
const demanding = (options: (typeof SUDOKU_CONFIG)[keyof typeof SUDOKU_CONFIG]) => {
  for (let seed = 1; seed <= 40; seed++) {
    const board = generateSudoku(seed, options)
    if (gradeSudoku(board, options)) return board
  }
  throw new Error("no board met the tier's own gate in 40 seeds")
}

describe("generateSudoku", () => {
  it("builds the one grid this family is authored at: 6 wide, chambers two across and three down", () => {
    const board = generateSudoku(1, SUDOKU_CONFIG.starter)
    expect(board.size).toBe(SUDOKU_SIZE)
    expect(board.boxWidth).toBe(SUDOKU_BOX_WIDTH)
    expect(board.boxHeight).toBe(SUDOKU_BOX_HEIGHT)
    expect(board.givens).toHaveLength(6)
  })

  it("answers with a grid holding each value once in every row, column and chamber", () => {
    const { solution, ...shape } = generateSudoku(2, SUDOKU_CONFIG.expert)
    for (const unit of unitsOf(shape))
      expect(new Set(unit.cells.map(cell => solution[cell.row][cell.col])).size).toBe(6)
  })

  it("ships only squares its own answer agrees with", () => {
    const board = generateSudoku(3, SUDOKU_CONFIG.junior)
    board.givens.forEach((row, rowIndex) =>
      row.forEach((value, colIndex) => {
        if (value !== undefined) expect(value).toBe(board.solution[rowIndex][colIndex])
      })
    )
  })

  /**
   * Rule 9 of the bar (`docs/instructions/puzzle-screens.md` §5): a board must be reachable by
   * deduction alone. Every dig is kept only where the tier's own ladder still finishes the board, so a
   * board that ships was settled step by forced step — which settles uniqueness with it, since nothing
   * along the way was ever a choice.
   */
  it.each(difficulties)(
    "needs no guess at %s: the tier's own ladder finishes every board",
    difficulty => {
      for (const seed of SEEDS) {
        const board = generateSudoku(seed, SUDOKU_CONFIG[difficulty])
        const solved = solveSudokuByTechniques(board, techniquesFor(board.techniqueCap))
        expect(solved.settled, `seed ${seed}`).toBe(true)
        expect(solved.values).toEqual(board.solution)
      }
    },
    120_000
  )

  it.each(difficulties)(
    "hands %s the squares its tier said it may keep, and no more",
    difficulty => {
      const { minGivens = 0 } = SUDOKU_CONFIG[difficulty]
      for (const seed of SEEDS) {
        const board = generateSudoku(seed, SUDOKU_CONFIG[difficulty])
        // The floor is where the digging stops, so a board never ships with fewer — and never with the
        // whole grid either, or there would be nothing to solve.
        expect(filled(board), `seed ${seed}`).toBeGreaterThanOrEqual(minGivens)
        expect(filled(board)).toBeLessThan(SUDOKU_SIZE * SUDOKU_SIZE)
      }
    },
    120_000
  )

  it("digs deeper the harder the tier, so the ladder and the board move together", () => {
    const given = (difficulty: (typeof difficulties)[number]) =>
      SEEDS.map(seed => filled(generateSudoku(seed, SUDOKU_CONFIG[difficulty]))).reduce((a, b) => a + b, 0) /
      SEEDS.length
    expect(given("starter")).toBeGreaterThan(given("junior"))
    expect(given("junior")).toBeGreaterThan(given("expert"))
    expect(given("expert")).toBeGreaterThan(given("master"))
  }, 120_000)

  it("is deterministic: the same seed and the same tier build the same board", () => {
    expect(generateSudoku(9, SUDOKU_CONFIG.expert)).toEqual(generateSudoku(9, SUDOKU_CONFIG.expert))
  })
})

describe("what a tier is guaranteed to demand", () => {
  /**
   * A board "demands" a rung when the ladder BELOW it cannot finish the board — the only form of the
   * claim that means anything, since a cheapest-first solver reaches a dear step only where the cheap
   * ones have run out (design doc §5.3).
   */
  it.each(difficulties)(
    "%s hands back a board its own gentler ladder cannot finish",
    difficulty => {
      const options = SUDOKU_CONFIG[difficulty]
      if (!options.demands) return
      const graded = SEEDS.map(seed => generateSudoku(seed, options)).filter(board => gradeSudoku(board, options))
      // Not every seed lands the rung — the top tier's is rare on a grid this small — so the guarantee is
      // stated where it belongs: on the boards that GRADE, which are the only ones the seed lists carry.
      expect(graded.length).toBeGreaterThan(0)
      for (const board of graded)
        expect(solveSudokuByTechniques(board, techniquesBelow(options.demands!)).settled).toBe(false)
    },
    180_000
  )

  it("hands back a real board rather than nothing when the tier's rung does not turn up", () => {
    // The nearest miss: solvable by the tier's ladder, unique, dug to the same floor — it simply fell
    // to a gentler reason. A room whose bucket is missing gets a slightly gentler board, never none.
    const options = SUDOKU_CONFIG.wizard
    const board = generateSudoku(5, options, 1)
    expect(solveSudokuByTechniques(board, techniquesFor(board.techniqueCap)).settled).toBe(true)
  })
})

describe("gradeSudoku", () => {
  it("keeps the board its own loop would have kept", () => {
    const options = SUDOKU_CONFIG.expert
    expect(gradeSudoku(generateSudoku(1, options), options)).toMatchObject({ deepest: "hiddenSingle" })
  })

  it("turns down a board that falls to a gentler reason than the tier asked for", () => {
    // A starter board graded against the top tier's ask: solvable, but by singles alone.
    const gentle = generateSudoku(1, SUDOKU_CONFIG.starter)
    expect(gradeSudoku(gentle, SUDOKU_CONFIG.wizard)).toBeNull()
  })

  it("turns down a board the tier's own ladder cannot finish", () => {
    // Judged as a starter board, a grid that genuinely needs the chamber-line rung asks for reasoning
    // that tier may not spend.
    expect(gradeSudoku(demanding(SUDOKU_CONFIG.wizard), SUDOKU_CONFIG.starter)).toBeNull()
  }, 120_000)
})

describe("the options a seed list keys on", () => {
  it("files every tier under its own bucket, so a dial moved takes the key with it", () => {
    // `docs/instructions/puzzle-screens.md` §6.1: the bucket is a hash of the options object, which is
    // what makes a list self-invalidating. Two tiers sharing a table would share a list, which is
    // correct rather than wasteful — these five do not.
    const hashes = difficulties.map(difficulty => configHash(SUDOKU_CONFIG[difficulty]))
    expect(new Set(hashes).size).toBe(difficulties.length)
  })
})
