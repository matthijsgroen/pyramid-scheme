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
      numberRange: [1, 10],
      symbolOffset: 0,
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
      numberRange: [1, 10],
      symbolOffset: 0,
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(12345) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("5 * 10 * 4 = 200")
  })

  it("guarantees a positive number > 0 result", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      symbolOffset: 0,
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(6) // Fixed seed that would produce a 0 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("7 * 6 * 1 = 42")
  })

  it("prevents broken numbers", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      symbolOffset: 0,
      operations: ["+", "-", "/", "*"],
    }
    const random = mulberry32(6) // Fixed seed that would produce a 6.142857142857140 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("7 * 6 * 1 = 42")
  })

  it("can have multiple operators in a formula", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      symbolOffset: 0,
      operations: ["+", "-", "/", "*"],
    }
    const random = mulberry32(12344) // Fixed seed that would produce a 6.142857142857140 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("6 + 9 * 7 = 69")
  })

  it("respects the operations order", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      symbolOffset: 0,
      operations: ["+", "-", "*", "/"],
    }
    const random = mulberry32(13355) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("1 * 9 - 2 = 7")
  })

  describe("hint formulas", () => {
    it("generates hint formulas with decreasing symbols", () => {
      const settings: RewardCalculationSettings = {
        amountSymbols: 3,
        numberRange: [1, 10],
        symbolOffset: 0,
        operations: ["+", "-", "*"],
      }
      const random = mulberry32(12345) // Fixed seed for reproducibility
      const result = generateRewardCalculation(settings, random)

      expect(result.hintFormulas.length).toBe(3)
      expect(formulaToString(result.hintFormulas[0])).toBe("10 + 10 + 10 = 30")
      expect(formulaToString(result.hintFormulas[1])).toBe("10 + 4 = 14")
      expect(formulaToString(result.hintFormulas[2])).toBe("10 + 5 * 4 = 30")
      expect(formulaToString(result.mainFormula)).toBe("5 * 10 * 4 = 200")
    })
  })

  it("generates symbol counts and mapping correctly", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      symbolOffset: 0,
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(12345) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const { symbolCounts, symbolMapping } = result
    expect(symbolMapping).toEqual({
      10: "𓂀",
      4: "𓃭",
      5: "𓁼",
    })
    expect(symbolCounts).toEqual({
      "𓁼": 2,
      "𓂀": 6,
      "𓃭": 3,
    })
  })

  it("displays a puzzle with the correct symbols", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      symbolOffset: 0,
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(12345) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const { symbolMapping } = result
    const puzzle = [
      ...result.hintFormulas.map((formula) =>
        formulaToString(formula, symbolMapping, true)
      ),
      formulaToString(result.mainFormula, symbolMapping, false),
    ].join("\n")
    expect(puzzle).toMatchInlineSnapshot(`
      "𓂀 + 𓂀 + 𓂀 = 30
      𓂀 + 𓃭 = 14
      𓂀 + 𓁼 * 𓃭 = 30
      𓁼 * 𓂀 * 𓃭 = ?"
    `)
  })

  it("can generate a puzzle with high difficulty", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 5,
      numberRange: [4, 10],
      symbolOffset: 0,
      operations: ["+", "-", "*", "/"],
    }
    const random = mulberry32(43210) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const { symbolMapping } = result
    const puzzle = [
      ...result.hintFormulas.map((formula) =>
        formulaToString(formula, symbolMapping, true)
      ),
      formulaToString(result.mainFormula, symbolMapping, false),
    ].join("\n")
    expect(puzzle).toMatchInlineSnapshot(`
      "𓂀 + 𓂀 = 12
      𓂀 + 𓃭 = 14
      𓂀 * 𓁼 / 𓃭 = 3
      (𓃭 + 𓁼) / 𓂀 / 𓃗 = 18
      𓂀 - 𓇡 + 𓃭 + 𓁼 + 𓃗 = 17
      𓂀 * (𓇡 - 𓃭) + 𓃗 + 𓁼 = ?"
    `)
  })

  it("can generate a puzzle with low difficulty", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 2,
      numberRange: [1, 4],
      symbolOffset: 0,
      operations: ["+"],
    }
    const random = mulberry32(12345) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const { symbolMapping } = result
    const puzzle = [
      ...result.hintFormulas.map((formula) =>
        formulaToString(formula, symbolMapping, true)
      ),
      formulaToString(result.mainFormula, symbolMapping, false),
    ].join("\n")
    expect(puzzle).toMatchInlineSnapshot(`
      "𓂀 + 𓂀 + 𓂀 = 12
      𓂀 + 𓃭 + 𓂀 = 10
      𓂀 + 𓃭 = ?"
    `)
  })
})
