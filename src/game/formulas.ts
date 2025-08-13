import { shuffle } from "./random"

export type Operation = "+" | "-" | "*" | "/"

export type Formula = {
  left: number | Formula
  right: number | Formula
  operation: Operation
  result: number
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
    formula.result <= 0 ||
    !Number.isInteger(formula.result) ||
    isNaN(formula.result)
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
