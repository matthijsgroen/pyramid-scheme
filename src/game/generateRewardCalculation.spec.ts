import { describe, expect, it } from "vitest"
import {
  formulaToString,
  generateRewardCalculation,
  type RewardCalculationSettings,
} from "./generateRewardCalculation"
import { mulberry32 } from "./random"

describe(generateRewardCalculation, () => {
  it("generates a reward calculation with unique symbols", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      operations: ["+", "-"],
    }
    const random = mulberry32(12345) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)

    expect(result.pickedNumbers.length).toBe(3)
    expect(new Set(result.pickedNumbers).size).toBe(3) // Ensure uniqueness
    expect(result.pickedNumbers).toEqual([10, 4, 5])
  })

  it("generates a valid calculation formula", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(12345) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("10 - 4 - 5 = 1")
  })

  it("guarantees a positive number > 0 result", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(6) // Fixed seed that would produce a 0 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("6 * 1 * 7 = 42")
  })

  it("prevents broken numbers", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      operations: ["+", "-", "/", "*"],
    }
    const random = mulberry32(6) // Fixed seed that would produce a 6.142857142857140 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("6 * 1 * 7 = 42")
  })

  it("can have multiple operators in a formula", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      operations: ["+", "-", "/", "*"],
    }
    const random = mulberry32(12344) // Fixed seed that would produce a 6.142857142857140 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("6 * 7 + 9 = 51")
  })

  it("respects the operations order", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      operations: ["+", "-", "*", "/"],
    }
    const random = mulberry32(13355) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("(1 + 9) * 2 = 20")
  })
})
