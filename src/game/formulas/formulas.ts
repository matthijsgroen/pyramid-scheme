import { shuffle } from "../random"
import { findFormulaWithOptionalExtra } from "./formulasWithTarget"

export type Operation = "+" | "-" | "*" | "/"

export type Formula = {
  left: number | Formula | { symbol: number }
  right: number | Formula | { symbol: number }
  operation: Operation
  result: number | { symbol: number }
}

export type FormulaSettings = {
  pickedNumbers: number[]
  operations: Operation[]
  useResult?: "avoid" | "force" | "allow"
  maxMultiplications?: number
  maxMultiplyOperandResult?: number
}

const getNumberValue = (value: number | { symbol: number } | Formula): number => {
  if (typeof value === "number") return value
  if ("symbol" in value) return value.symbol
  return getNumberValue(value.result)
}

export const createFormula = (settings: FormulaSettings, random: () => number): Formula => {
  const { pickedNumbers, operations, useResult = "avoid", maxMultiplications, maxMultiplyOperandResult } = settings

  if (useResult === "allow" || useResult === "force") {
    // take largest result from picked numbers and remove it from the pool
    const largest = Math.max(...pickedNumbers)
    const formula = findFormulaWithOptionalExtra(
      pickedNumbers.filter(n => n !== largest),
      operations,
      [largest],
      random
    )
    if (formula) return formula
  }

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

  // Recursively create formulas for each group, forwarding maxMultiplications so
  // sub-expressions respect the same budget and don't inflate outer retry pressure
  const leftFormula =
    leftNumbers.length === 1
      ? { symbol: leftNumbers[0] }
      : createVerifiedFormula(
          { pickedNumbers: leftNumbers, operations, maxMultiplications, maxMultiplyOperandResult },
          random
        )
  const rightFormula =
    rightNumbers.length === 1
      ? { symbol: rightNumbers[0] }
      : createVerifiedFormula(
          { pickedNumbers: rightNumbers, operations, maxMultiplications, maxMultiplyOperandResult },
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

const evaluateFormula = (left: number, right: number, operation: Operation): number => {
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

export const countMultiplicativeOps = (formula: Formula): number => {
  const isMultiplicative = formula.operation === "*" || formula.operation === "/"
  const leftCount =
    typeof formula.left !== "number" && !("symbol" in formula.left) ? countMultiplicativeOps(formula.left) : 0
  const rightCount =
    typeof formula.right !== "number" && !("symbol" in formula.right) ? countMultiplicativeOps(formula.right) : 0
  return (isMultiplicative ? 1 : 0) + leftCount + rightCount
}

/** Every picked number, added left to right. The one shape that satisfies every verifier whatever the
 * numbers are, which is what makes it usable as a last resort. */
const additiveChain = (picked: number[]): Formula => {
  if (picked.length < 2) throw new Error(`a formula needs at least two numbers, got ${JSON.stringify(picked)}`)
  let node: Formula = {
    left: { symbol: picked[0] },
    right: { symbol: picked[1] },
    operation: "+",
    result: picked[0] + picked[1],
  }
  for (const next of picked.slice(2)) {
    node = { left: node, right: { symbol: next }, operation: "+", result: getNumberValue(node) + next }
  }
  return node
}

export const createVerifiedFormula = (settings: FormulaSettings, random: () => number = Math.random): Formula => {
  const { pickedNumbers } = settings
  let formula = createFormula(settings, random)
  // Ensure the result is positive and greater than 0
  let iteration = 0

  const verifyOperand = (operand: number | { symbol: number } | Formula): boolean => {
    const value = getNumberValue(operand)
    return value > 0 && Number.isInteger(value) && !isNaN(value)
  }
  const collectAdditiveSymbolSigns = (
    node: number | { symbol: number } | Formula,
    sign: 1 | -1,
    signs: Map<number, Set<1 | -1>>
  ): void => {
    if (typeof node === "number") return
    if ("symbol" in node) {
      if (!signs.has(node.symbol)) signs.set(node.symbol, new Set())
      signs.get(node.symbol)!.add(sign)
      return
    }
    if (node.operation === "+" || node.operation === "-") {
      collectAdditiveSymbolSigns(node.left, sign, signs)
      collectAdditiveSymbolSigns(node.right, node.operation === "-" ? ((sign * -1) as 1 | -1) : sign, signs)
    }
  }
  const verifySelfDivision = (formula: Formula): boolean => {
    if (formula.operation === "/" && getNumberValue(formula.right) === 1) {
      return false
    }
    if (
      formula.operation === "/" &&
      typeof formula.left === "object" &&
      typeof formula.right === "object" &&
      "symbol" in formula.left &&
      "symbol" in formula.right &&
      formula.left.symbol === formula.right.symbol
    ) {
      return false
    }
    return true
  }
  const verifyNoAdditiveCancellation = (formula: Formula): boolean => {
    const signs = new Map<number, Set<1 | -1>>()
    collectAdditiveSymbolSigns(formula, 1, signs)
    for (const symbolSigns of signs.values()) {
      if (symbolSigns.has(1) && symbolSigns.has(-1)) return false
    }
    return true
  }
  const verifyMultiplyOperands = (formula: Formula): boolean => {
    if (settings.maxMultiplyOperandResult === undefined) return true
    if (formula.operation === "*") {
      if (getNumberValue(formula.left) > settings.maxMultiplyOperandResult) return false
      if (getNumberValue(formula.right) > settings.maxMultiplyOperandResult) return false
    }
    const leftOk =
      typeof formula.left !== "number" && !("symbol" in formula.left) ? verifyMultiplyOperands(formula.left) : true
    const rightOk =
      typeof formula.right !== "number" && !("symbol" in formula.right) ? verifyMultiplyOperands(formula.right) : true
    return leftOk && rightOk
  }

  const passes = (candidate: Formula): boolean =>
    verifyOperand(candidate.result) &&
    verifyOperand(candidate.left) &&
    verifyOperand(candidate.right) &&
    verifySelfDivision(candidate) &&
    verifyNoAdditiveCancellation(candidate) &&
    verifyMultiplyOperands(candidate) &&
    (settings.maxMultiplications === undefined || countMultiplicativeOps(formula) <= settings.maxMultiplications)

  while (!passes(formula)) {
    iteration++
    if (iteration > 100) {
      // RE-ROLLING CANNOT ALWAYS WIN, because the numbers are the caller's and only the shape is
      // re-rolled. With `useResult` allowing one, the largest picked number IS the result, so a set
      // like 2, 6 and 12 leaves exactly one formula — 2 x 6 — and a `maxMultiplyOperandResult` of 5
      // forbids it. Every attempt then returns the same rejected formula, and the hundredth is the
      // first one anybody notices.
      //
      // The cap is a comfort, not a rule: it keeps a tier from asking for a multiplication bigger than
      // its players are ready for. Solvability does not depend on it. So it is what gets dropped —
      // one board above its tier's comfort beats a room that cannot be entered, which is what throwing
      // here amounted to: the puzzle is built during render, so the throw took the whole app down.
      if (settings.maxMultiplyOperandResult !== undefined) {
        return createVerifiedFormula({ ...settings, maxMultiplyOperandResult: undefined }, random)
      }
      // AND RE-ROLLING IS NOT ALWAYS A RE-ROLL. For some number sets the shape is settled before any
      // randomness gets a say: 16, 11 and 15 produce `(11 - 15) * -4` on all four hundred attempts we
      // measured, and a negative operand is rejected every time. A hundred identical attempts is not
      // bad luck to wait out, it is the same answer a hundred times.
      //
      // So the last resort is a formula that cannot fail: every picked number added together. Every
      // operand stays positive, no symbol appears on both sides of a minus, and there is no
      // multiplication to cap — it passes every check above by construction. A duller board than the
      // tier asked for, and a board, which is what the room needs to be enterable at all.
      return additiveChain(pickedNumbers)
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
  showAnswer === "no"
    ? formulaPartToString(formula, mapping)
    : `${formulaPartToString(formula, mapping)} = ${
        showAnswer === "yes" ? showValue(formula.result, mapping) : showAnswer === "obfuscated" ? "?" : ""
      }`

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

const showValue = (value: number | { symbol: number }, mapping: Record<number, string>) => {
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

  const needsParenthesesRight =
    formula.operation === "-" && typeof formula.right !== "number" && !("symbol" in formula.right)

  const result = `${leftStr} ${formula.operation} ${needsParenthesesRight ? `(${rightStr})` : rightStr}`

  return needsParentheses ? `(${result})` : result
}
