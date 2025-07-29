type Operation = "+" | "-" | "*" | "/" | "mod" | "div" | "pow"

/**
 * Describe a reward calculation.
 * where all numbers are replaced by symbols,
 *
 */
export type RewardCalculationSettings = {
  amountSymbols: number
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
  mainFormula: Formula
  hintFormula: Formula[]
}

export const generateRewardCalculation = (
  settings: RewardCalculationSettings,
  random: () => number
): RewardCalculation => {
  // Step 1: Pick random numbers for each symbol, without duplicates
  const pickedNumbers: number[] = []
  while (pickedNumbers.length < settings.amountSymbols) {
    const number = Math.floor(random() * 10) + 1 // Random numbers between 1 and 10
    if (!pickedNumbers.includes(number)) {
      pickedNumbers.push(number)
    }
  }

  // Step 2: Generate a formula where all symbols occur (maybe multiple times)
  const mainFormula = createVerifiedFormula(
    pickedNumbers,
    settings.operations,
    random
  )

  return { pickedNumbers, mainFormula, hintFormula: [] }
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
    case "mod":
      return right !== 0 ? left % right : NaN
    case "div":
      return right !== 0 ? Math.floor(left / right) : NaN
    case "pow":
      return Math.pow(left, right)
    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
}

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
  const leftNumbers = pickedNumbers.slice(0, splitIndex)
  const rightNumbers = pickedNumbers.slice(splitIndex)

  // Recursively create formulas for each group
  const leftFormula =
    leftNumbers.length === 1
      ? leftNumbers[0]
      : createFormula(leftNumbers, operations, random)
  const rightFormula =
    rightNumbers.length === 1
      ? rightNumbers[0]
      : createFormula(rightNumbers, operations, random)

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

export const formulaToString = (formula: Formula): string => {
  return `${formulaPartToString(formula)} = ${formula.result}`
}

const getOperatorPrecedence = (operation: Operation): number => {
  switch (operation) {
    case "+":
    case "-":
      return 1
    case "*":
    case "/":
    case "mod":
    case "div":
      return 2
    case "pow":
      return 3
    default:
      return 0
  }
}

const formulaPartToString = (
  formula: Formula,
  parentPrecedence: number = 0
): string => {
  const currentPrecedence = getOperatorPrecedence(formula.operation)
  const needsParentheses = currentPrecedence < parentPrecedence

  const leftStr =
    typeof formula.left === "number"
      ? formula.left.toString()
      : formulaPartToString(formula.left, currentPrecedence)

  const rightStr =
    typeof formula.right === "number"
      ? formula.right.toString()
      : formulaPartToString(formula.right, currentPrecedence)

  const result = `${leftStr} ${formula.operation} ${rightStr}`

  return needsParentheses ? `(${result})` : result
}
