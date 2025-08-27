import { shuffle } from "@/game/random"
import {
  createVerifiedFormula,
  formulaToString,
  type Formula,
  type Operation,
} from "../app/Formulas/formulas"

/**
 * Describe a reward calculation.
 * where all numbers are replaced by symbols,
 *
 */
export type RewardCalculationSettings = {
  amountSymbols: number
  hieroglyphIds: string[]
  numberRange: [min: number, max: number]
  operations: Operation[]
}

export type RewardCalculation = {
  pickedNumbers: number[]
  symbolMapping: Record<number, string>
  symbolCounts: Record<string, number>
  mainFormula: Formula
  hintFormulas: Formula[]
}

export const generateRewardCalculation = (
  settings: RewardCalculationSettings,
  random: () => number = Math.random
): RewardCalculation => {
  // Step 1: Pick random numbers for each symbol, without duplicates
  const pickedNumbers: number[] = []
  let iteration = 0
  while (pickedNumbers.length < settings.amountSymbols) {
    const number =
      Math.floor(
        random() * (settings.numberRange[1] - settings.numberRange[0] + 1)
      ) + settings.numberRange[0]
    if (!pickedNumbers.includes(number)) {
      pickedNumbers.push(number)
    }
    iteration++
    if (iteration > 1000) {
      throw new Error("could not pick numbers for reward calculation")
    }
  }
  const symbolIds = shuffle(settings.hieroglyphIds, random)

  const symbolMapping: Record<number, string> = pickedNumbers.reduce(
    (acc, num, index) => {
      acc[num] = symbolIds[index]
      return acc
    },
    {} as Record<number, string>
  )
  const bonus = pickedNumbers[Math.floor(random() * pickedNumbers.length)]

  // Step 2: Generate a formula where all symbols occur (maybe multiple times)
  const mainFormulaNumbers = generateCalculationNumbers(
    pickedNumbers.concat(bonus),
    pickedNumbers,
    [],
    random
  )
  const mainFormula = createSmallestVerifiedFormula(
    mainFormulaNumbers,
    settings.operations,
    undefined, // no main formula yet
    random
  )

  // make a list of hint formulas
  // first make a list of numbers to use in the hint formulas
  // first hint formula uses all symbols, second hint formula uses all but one symbol, etc.
  const hintFormulas: Formula[] = []
  for (let i = 0; i < pickedNumbers.length; i++) {
    const hintNumbers = pickedNumbers.filter((_, index) => index <= i)
    const known = pickedNumbers.slice(0, i)
    const newNumbers = pickedNumbers.slice(i, i + 1)

    const operators: Operation[] =
      hintNumbers.length === 1
        ? settings.operations.filter((o) => o === "+" || o === "*")
        : settings.operations

    const hintNumbersCapped = shuffle(known, random)
      .slice(known.length > 1 ? -2 : undefined)
      .concat(newNumbers)

    let finished = false
    let loopIteration = 0
    while (!finished) {
      loopIteration++
      if (loopIteration > 100) {
        throw new Error("could not create hint formula")
      }
      const calcNumbers = generateCalculationNumbers(
        hintNumbersCapped,
        known,
        newNumbers,
        random
      )

      const hintFormula = createSmallestVerifiedFormula(
        calcNumbers,
        operators,
        mainFormula,
        random
      )
      if (hintFormula) {
        hintFormulas.push(hintFormula)
        finished = true
      }
      if (known[0] !== undefined) {
        hintNumbersCapped.push(known[0])
      }
    }
  }

  // count how many times each symbol occurs in the hint and main formulas
  const symbolCounts: Record<string, number> = {}
  const allFormulas = [mainFormula, ...hintFormulas]
  allFormulas.forEach((formula) => {
    const symbols = extractSymbols(formula)
    symbols.forEach((symbol) => {
      const symbolName = symbolMapping[parseInt(symbol, 10)]
      symbolCounts[symbolName] = (symbolCounts[symbolName] || 0) + 1
    })
  })

  return {
    pickedNumbers,
    mainFormula,
    hintFormulas,
    symbolMapping,
    symbolCounts,
  }
}

const generateCalculationNumbers = (
  hintNumbersCapped: number[],
  known: number[],
  newNumbers: number[],
  random: () => number
): number[] =>
  shuffle(
    hintNumbersCapped.flatMap<number>((num) => {
      if (known.length > 0 && newNumbers.includes(num)) {
        return [num] // new numbers should occur only once
      }

      const amount =
        Math.max(Math.floor(random() * (2 - hintNumbersCapped.length / 3)), 0) +
        1 +
        (hintNumbersCapped.length === 1 ? 1 : 0)
      return Array(amount).fill(num)
    }),
    random
  )

const createSmallestVerifiedFormula = (
  pickedNumbers: number[],
  operations: Operation[],
  mainFormula?: Formula,
  random: () => number = Math.random
): Formula =>
  [
    createVerifiedFormula(pickedNumbers, operations, random),
    createVerifiedFormula(pickedNumbers, operations, random),
    createVerifiedFormula(pickedNumbers, operations, random),
    createVerifiedFormula(pickedNumbers, operations, random),
  ]
    .filter((formula) =>
      mainFormula
        ? formulaToString(formula) !== formulaToString(mainFormula) &&
          formula.result !== mainFormula.result
        : true
    )
    .sort(
      (a, b) =>
        (typeof a.result === "number" ? a.result : a.result.symbol) -
        (typeof b.result === "number" ? b.result : b.result.symbol)
    )[0]

const extractSymbols = (formula: Formula): string[] => {
  const symbols: string[] = []

  const traverse = (node: number | Formula | { symbol: number }) => {
    if (typeof node !== "number") {
      if ("symbol" in node) {
        symbols.push(node.symbol.toString())
      } else {
        traverse(node.left)
        traverse(node.right)
        traverse(node.result)
      }
    }
  }

  traverse(formula)
  return symbols
}
