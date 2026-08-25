import type { Difficulty } from "@/data/difficultyLevels"
import type { Operation } from "@/game/formulas/formulas"

/** The dials one crossing is built from (docs/game-design/puzzles/crocodile.md §4). */
export type CrocodileOptions = {
  /** Columns of stones between the two banks — one crocodile each, so one decision per column. */
  columns: number
  stonesPerColumn: number
  /**
   * "allBiggest" is the family's debut board — every crocodile wants the biggest answer, so the rule is
   * learned once and never re-read. "mixed" draws per column, so the player has to read what the
   * crocodile in front of them wants instead of settling into one habit.
   */
  signs: "allBiggest" | "mixed"
  numberOfSymbols: number
  numberRange: [min: number, max: number]
  operators: Operation[]
  maxMultiplyOperandResult?: number
}

// Starter tombs author no capstone at all (see worldGen/spec/starter.ts) and the family's minTier is
// junior, so the starter row exists only because Difficulty is a closed union — it is never built.
export const CROCODILE_CONFIG: Record<Difficulty, CrocodileOptions> = {
  starter: {
    columns: 3,
    stonesPerColumn: 2,
    signs: "allBiggest",
    numberOfSymbols: 2,
    numberRange: [1, 5],
    operators: ["+"],
  },
  junior: {
    columns: 3,
    stonesPerColumn: 2,
    signs: "allBiggest",
    numberOfSymbols: 3,
    numberRange: [1, 10],
    operators: ["+", "-"],
  },
  expert: {
    columns: 4,
    stonesPerColumn: 3,
    signs: "mixed",
    numberOfSymbols: 3,
    numberRange: [1, 10],
    operators: ["+", "-", "*"],
    maxMultiplyOperandResult: 5,
  },
  master: {
    columns: 4,
    stonesPerColumn: 3,
    signs: "mixed",
    numberOfSymbols: 4,
    numberRange: [1, 12],
    operators: ["+", "-", "*"],
    maxMultiplyOperandResult: 8,
  },
  wizard: {
    columns: 5,
    stonesPerColumn: 4,
    signs: "mixed",
    numberOfSymbols: 4,
    numberRange: [1, 15],
    operators: ["+", "-", "*"],
    maxMultiplyOperandResult: 10,
  },
}
