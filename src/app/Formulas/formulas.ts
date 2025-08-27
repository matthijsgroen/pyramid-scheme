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
  settings: {
    pickedNumbers: number[]
    operations: Operation[]
  },
  random: () => number
): Formula => {
  const { pickedNumbers, operations } = settings
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
      : createVerifiedFormula(
          { pickedNumbers: leftNumbers, operations },
          random
        )
  const rightFormula =
    rightNumbers.length === 1
      ? { symbol: rightNumbers[0] }
      : createVerifiedFormula(
          { pickedNumbers: rightNumbers, operations },
          random
        )

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
  settings: {
    pickedNumbers: number[]
    operations: Operation[]
  },
  random: () => number = Math.random
): Formula => {
  let formula = createFormula(settings, random)
  // Ensure the result is positive and greater than 0
  let iteration = 0

  const verifyOperand = (
    operand: number | { symbol: number } | Formula
  ): boolean => {
    const value = getNumberValue(operand)
    return value > 0 && Number.isInteger(value) && !isNaN(value)
  }

  while (
    !verifyOperand(formula.result) ||
    !verifyOperand(formula.left) ||
    !verifyOperand(formula.right)
  ) {
    iteration++
    if (iteration > 100) {
      console.log("formula", formula, settings)
      throw new Error("could not create verified formula")
    }
    formula = createFormula(settings, random)
  }
  return formula
}

export const formulaToString = (
  formula: Formula,
  mapping: Record<number, string> = {},
  showAnswer: "no" | "yes" | "obfuscated" = "yes"
): string =>
  `${formulaPartToString(formula, mapping)} = ${showAnswer === "yes" ? showValue(formula.result, mapping) : showAnswer === "obfuscated" ? "?" : ""}`

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

const showValue = (
  value: number | { symbol: number },
  mapping: Record<number, string>
) => {
  if (typeof value === "number") {
    return value.toString()
  }
  return mapping[value.symbol] ?? value.symbol.toString()
}

const formulaPartToString = (
  formula: Formula,
  mapping: Record<number, string> = {},
  parentPrecedence: number = 0
): string => {
  const currentPrecedence = getOperatorPrecedence(formula.operation)
  const needsParentheses = currentPrecedence < parentPrecedence

  const leftStr =
    typeof formula.left === "number" || "symbol" in formula.left
      ? showValue(formula.left, mapping)
      : formulaPartToString(formula.left, mapping, currentPrecedence)

  const rightStr =
    typeof formula.right === "number" || "symbol" in formula.right
      ? showValue(formula.right, mapping)
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
