import { shuffle } from "@/game/random"

export type Operation = "+" | "-" | "*" | "/"

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

export type Formula = {
  left: number | Formula
  right: number | Formula
  operation: Operation
  result: number
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
  random: () => number
): RewardCalculation => {
  // Step 1: Pick random numbers for each symbol, without duplicates
  const pickedNumbers: number[] = []
  while (pickedNumbers.length < settings.amountSymbols) {
    const number =
      Math.floor(
        random() * (settings.numberRange[1] - settings.numberRange[0] + 1)
      ) + settings.numberRange[0]
    if (!pickedNumbers.includes(number)) {
      pickedNumbers.push(number)
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
  const mainFormula = createVerifiedFormula(
    mainFormulaNumbers,
    settings.operations,
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
      .slice(-2)
      .concat(newNumbers)

    let finished = false
    while (!finished) {
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
      hintNumbersCapped.push(known[0])
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

const evaluateFormula = (
  left: number,
  right: number,
  operation: Operation
): number => {
  switch (operation) {
    case "+":
      return left + right
    case "-":
      return left - right
    case "*":
      return left * right
    case "/":
      return right !== 0 ? left / right : NaN
    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
}

const generateCalculationNumbers = (
  hintNumbersCapped: number[],
  known: number[],
  newNumbers: number[],
  random: () => number
): number[] => {
  return shuffle(
    hintNumbersCapped.flatMap<number>((num) => {
      if (known.length > 0 && newNumbers.includes(num)) {
        return [num] // new numbers should occur only once
      }

      const amount =
        Math.floor(random() * (2 - hintNumbersCapped.length / 3)) +
        1 +
        (hintNumbersCapped.length === 1 ? 1 : 0)
      return Array(amount).fill(num)
    }),
    random
  )
}

const createSmallestVerifiedFormula = (
  pickedNumbers: number[],
  operations: Operation[],
  mainFormula: Formula,
  random: () => number
): Formula =>
  [
    createVerifiedFormula(pickedNumbers, operations, random),
    createVerifiedFormula(pickedNumbers, operations, random),
    createVerifiedFormula(pickedNumbers, operations, random),
    createVerifiedFormula(pickedNumbers, operations, random),
  ]
    .filter(
      (formula) =>
        formulaToString(formula) !== formulaToString(mainFormula) &&
        formula.result !== mainFormula.result
    )
    .sort((a, b) => a.result - b.result)[0]

const createVerifiedFormula = (
  pickedNumbers: number[],
  operations: Operation[],
  random: () => number
): Formula => {
  let formula = createFormula(pickedNumbers, operations, random)
  // Ensure the result is positive and greater than 0
  while (
    formula.result <= 0 ||
    !Number.isInteger(formula.result) ||
    isNaN(formula.result)
  ) {
    formula = createFormula(pickedNumbers, operations, random)
  }
  return formula
}

const createFormula = (
  pickedNumbers: number[],
  operations: Operation[],
  random: () => number
): Formula => {
  // Base case: if only one number left, return it as a formula node
  if (pickedNumbers.length === 2) {
    const operation = operations[Math.floor(random() * operations.length)]
    return {
      left: pickedNumbers[0],
      right: pickedNumbers[1],
      operation,
      result: evaluateFormula(pickedNumbers[0], pickedNumbers[1], operation),
    }
  }

  // Randomly split the pickedNumbers into two non-empty groups
  const splitIndex = Math.floor(random() * (pickedNumbers.length - 1)) + 1
  const shuffledNumbers = shuffle(pickedNumbers, random)
  const leftNumbers = shuffledNumbers.slice(0, splitIndex)
  const rightNumbers = shuffledNumbers.slice(splitIndex)

  // Recursively create formulas for each group
  const leftFormula =
    leftNumbers.length === 1
      ? leftNumbers[0]
      : createVerifiedFormula(leftNumbers, operations, random)
  const rightFormula =
    rightNumbers.length === 1
      ? rightNumbers[0]
      : createVerifiedFormula(rightNumbers, operations, random)

  // Pick a random operation
  const operation = operations[Math.floor(random() * operations.length)]

  // Evaluate the result
  const leftValue =
    typeof leftFormula === "number" ? leftFormula : leftFormula.result
  const rightValue =
    typeof rightFormula === "number" ? rightFormula : rightFormula.result
  const result = evaluateFormula(leftValue, rightValue, operation)

  return {
    left: leftFormula,
    right: rightFormula,
    operation,
    result,
  }
}

export const formulaToString = (
  formula: Formula,
  mapping: Record<number, string> = {},
  showAnswer = true
): string => {
  return `${formulaPartToString(formula, mapping)} = ${showAnswer ? formula.result : "?"}`
}

const getOperatorPrecedence = (operation: Operation): number => {
  switch (operation) {
    case "+":
    case "-":
      return 1
    case "*":
    case "/":
      return 2
    default:
      return 0
  }
}

const formulaPartToString = (
  formula: Formula,
  mapping: Record<number, string>,
  parentPrecedence: number = 0
): string => {
  const currentPrecedence = getOperatorPrecedence(formula.operation)
  const needsParentheses = currentPrecedence < parentPrecedence

  const leftStr =
    typeof formula.left === "number"
      ? (mapping[formula.left] ?? formula.left.toString())
      : formulaPartToString(formula.left, mapping, currentPrecedence)

  const rightStr =
    typeof formula.right === "number"
      ? (mapping[formula.right] ?? formula.right.toString())
      : formulaPartToString(formula.right, mapping, currentPrecedence)

  const result =
    formula.operation === "-"
      ? `${typeof formula.left === "number" ? leftStr : "(" + leftStr + ")"} ${formula.operation} ${
          typeof formula.right === "number" ? rightStr : "(" + rightStr + ")"
        }`
      : `${leftStr} ${formula.operation} ${rightStr}`

  return needsParentheses ? `(${result})` : result
}

const extractSymbols = (formula: Formula): string[] => {
  const symbols: string[] = []

  const traverse = (node: number | Formula) => {
    if (typeof node === "number") {
      symbols.push(node.toString())
    } else {
      traverse(node.left)
      traverse(node.right)
    }
  }

  traverse(formula)
  return symbols
}
