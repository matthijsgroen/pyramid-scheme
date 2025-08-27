import { shuffle } from "../../game/random"

export type Operation = "+" | "-" | "*" | "/"

export type Formula = {
  left: number | Formula | { symbol: number }
  right: number | Formula | { symbol: number }
  operation: Operation
  result: number | { symbol: number }
}

const getNumberValue = (
  value: number | { symbol: number } | Formula
): number => {
  if (typeof value === "number") return value
  if ("symbol" in value) return value.symbol
  return getNumberValue(value.result)
}

export const createFormula = (
  pickedNumbers: number[],
  operations: Operation[],
  random: () => number
): Formula => {
  // Base case: if only one number left, return it as a formula node
  if (pickedNumbers.length === 2) {
    const operation = operations[Math.floor(random() * operations.length)]
    return {
      left: { symbol: pickedNumbers[0] },
      right: { symbol: pickedNumbers[1] },
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
      ? { symbol: leftNumbers[0] }
      : createVerifiedFormula(leftNumbers, operations, random)
  const rightFormula =
    rightNumbers.length === 1
      ? { symbol: rightNumbers[0] }
      : createVerifiedFormula(rightNumbers, operations, random)

  // Pick a random operation
  const operation = operations[Math.floor(random() * operations.length)]

  // Evaluate the result
  const leftValue = getNumberValue(leftFormula)
  const rightValue = getNumberValue(rightFormula)
  const result = evaluateFormula(leftValue, rightValue, operation)

  return {
    left: leftFormula,
    right: rightFormula,
    operation,
    result,
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

export const createVerifiedFormula = (
  pickedNumbers: number[],
  operations: Operation[],
  random: () => number = Math.random
): Formula => {
  let formula = createFormula(pickedNumbers, operations, random)
  // Ensure the result is positive and greater than 0
  let iteration = 0
  while (
    getNumberValue(formula.result) <= 0 ||
    !Number.isInteger(formula.result) ||
    isNaN(getNumberValue(formula.result))
  ) {
    iteration++
    if (iteration > 100) {
      console.log("formula", formula, pickedNumbers)
      throw new Error("could not create verified formula")
    }
    formula = createFormula(pickedNumbers, operations, random)
  }
  return formula
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

export const formulaPartToString = (
  formula: Formula,
  mapping: Record<number, string> = {},
  parentPrecedence: number = 0
): string => {
  const currentPrecedence = getOperatorPrecedence(formula.operation)
  const needsParentheses = currentPrecedence < parentPrecedence

  const leftStr =
    typeof formula.left === "number"
      ? formula.left.toString()
      : "symbol" in formula.left
        ? (mapping[formula.left.symbol] ?? formula.left.symbol.toString())
        : formulaPartToString(formula.left, mapping, currentPrecedence)

  const rightStr =
    typeof formula.right === "number"
      ? formula.right.toString()
      : "symbol" in formula.right
        ? (mapping[formula.right.symbol] ?? formula.right.symbol.toString())
        : formulaPartToString(formula.right, mapping, currentPrecedence)

  const result =
    formula.operation === "-"
      ? `${leftStr} ${formula.operation} ${
          typeof formula.right === "number" || "symbol" in formula.right
            ? rightStr
            : "(" + rightStr + ")"
        }`
      : `${leftStr} ${formula.operation} ${rightStr}`

  return needsParentheses ? `(${result})` : result
}
