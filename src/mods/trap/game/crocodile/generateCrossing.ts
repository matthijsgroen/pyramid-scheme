import { createVerifiedFormula, type Formula } from "@/game/formulas/formulas"
import { mulberry32 } from "@/game/random"
import type { CrocodileOptions } from "./crocodileConfig"
import { winningMargins, type CrossingPuzzle, type Sign, type Stone } from "./crossingRules"

/**
 * How far the answer of a column may stand clear of its nearest rival.
 *
 * Beyond this the winner is readable from the shape of the sums and gets picked without any arithmetic,
 * which is the one thing this board is for.
 */
export const MAX_WINNING_MARGIN = 4

const valueOf = (formula: Formula): number =>
  typeof formula.result === "number" ? formula.result : formula.result.symbol

const drawSigns = (options: CrocodileOptions, random: () => number): Sign[] => {
  if (options.signs === "allBiggest") return Array.from({ length: options.columns }, () => "biggest" as Sign)
  // An all-same draw is the junior board wearing a harder sum. What a mixed board asks extra is that the
  // player reads what THIS crocodile wants rather than settling into one habit for the whole crossing.
  for (let attempt = 0; attempt < 20; attempt++) {
    const signs: Sign[] = Array.from({ length: options.columns }, () => (random() < 0.5 ? "biggest" : "smallest"))
    if (new Set(signs).size > 1) return signs
  }
  return Array.from({ length: options.columns }, (_, column) => (column % 2 === 0 ? "biggest" : "smallest"))
}

const drawStone = (options: CrocodileOptions, random: () => number): Stone => {
  const numbers = Array.from(
    { length: options.numberOfSymbols },
    () => options.numberRange[0] + Math.floor(random() * (options.numberRange[1] - options.numberRange[0] + 1))
  )
  const formula = createVerifiedFormula(
    {
      pickedNumbers: numbers,
      operations: options.operators,
      // One multiplication per stone at most: two of them is a sum nobody does in their head.
      maxMultiplications: options.operators.some(op => op === "*" || op === "/") ? 1 : undefined,
      maxMultiplyOperandResult: options.maxMultiplyOperandResult,
    },
    random
  )
  return { formula, value: valueOf(formula) }
}

/** One column of stones, all worth something different — two stones worth the same is one choice twice. */
const drawColumn = (options: CrocodileOptions, random: () => number): Stone[] | undefined => {
  const column: Stone[] = []
  for (let attempt = 0; column.length < options.stonesPerColumn && attempt < 100; attempt++) {
    const stone = drawStone(options, random)
    if (!column.some(placed => placed.value === stone.value)) column.push(stone)
  }
  return column.length === options.stonesPerColumn ? column : undefined
}

/**
 * Builds one crossing (docs/game-design/puzzles/crocodile.md §3).
 *
 * There is no route to search for: every column has exactly one stone its crocodile wants, so any set of
 * columns is already a crossable board. The only thing generation has to work at is that the answer
 * cannot be picked out by eye — hence the margin gate, applied per column rather than per board.
 */
export const generateCrossing = (seed: number, options: CrocodileOptions, attempts = 40): CrossingPuzzle => {
  const random = mulberry32(seed)
  const signs = drawSigns(options, random)
  const columns = signs.map((sign, index) => {
    let nearestMiss: Stone[] | undefined
    let nearestMargin = Infinity
    for (let attempt = 0; attempt < attempts; attempt++) {
      const column = drawColumn(options, random)
      if (!column) continue
      const margin = winningMargins({ columns: [column], signs: [sign] })[0]
      if (margin <= MAX_WINNING_MARGIN) return column
      if (margin < nearestMargin) {
        nearestMiss = column
        nearestMargin = margin
      }
    }
    // A column a little too easy still plays; a room with no board at all is a dead end in a tomb.
    if (!nearestMiss) throw new Error(`crocodile: column ${index} could not be built`)
    return nearestMiss
  })
  return { columns, signs }
}
