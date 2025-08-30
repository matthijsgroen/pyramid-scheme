import type { RewardCalculation } from "@/game/generateRewardCalculation"
import type { Formula } from "./formulas"

const createFormulaFilledPositions = (
  filledPositions: Record<string, number>,
  positionPrefix: string,
  formula: Formula
) => {
  if (typeof formula.left === "number") {
    // nothing to do
  } else if ("symbol" in formula.left) {
    filledPositions[`${positionPrefix}-left`] = formula.left.symbol
  } else {
    createFormulaFilledPositions(filledPositions, `${positionPrefix}-left`, formula.left)
  }

  if (typeof formula.right === "number") {
    // nothing to do
  } else if ("symbol" in formula.right) {
    filledPositions[`${positionPrefix}-right`] = formula.right.symbol
  } else {
    createFormulaFilledPositions(filledPositions, `${positionPrefix}-right`, formula.right)
  }
  if (typeof formula.result === "number") {
    // nothing to do
  } else if ("symbol" in formula.result) {
    filledPositions[`${positionPrefix}-result`] = formula.result.symbol
  }
}

export const createPositionOverview = (calculation: RewardCalculation): Record<string, number> => {
  const filledPositions: Record<string, number> = {}
  calculation.hintFormulas.forEach((formula, index) => {
    createFormulaFilledPositions(filledPositions, `formula-${index}`, formula)
  })
  createFormulaFilledPositions(filledPositions, `formula-${calculation.hintFormulas.length}`, calculation.mainFormula)

  return filledPositions
}
