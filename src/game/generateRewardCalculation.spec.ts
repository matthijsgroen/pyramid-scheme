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
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
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
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(12345) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("(4 + 10) * 5 = 70")
  })

  it("guarantees a positive number > 0 result", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(6) // Fixed seed that would produce a 0 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("1 * (6 + 7) = 13")
  })

  it("prevents broken numbers", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
      operations: ["+", "-", "/", "*"],
    }
    const random = mulberry32(6) // Fixed seed that would produce a 6.142857142857140 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("1 * (6 + 7) = 13")
  })

  it("can have multiple operators in a formula", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
      operations: ["+", "-", "/", "*"],
    }
    const random = mulberry32(12348) // Fixed seed that would produce a 6.142857142857140 result
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("(9 + 1) * 5 = 50")
  })

  it("respects the operations order", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
      operations: ["+", "-", "*", "/"],
    }
    const random = mulberry32(13353) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const formula = result.mainFormula
    const textFormula = formulaToString(formula)
    expect(textFormula).toBe("(2 + 6) * 8 = 64")
  })

  describe("hint formulas", () => {
    it("generates hint formulas with decreasing symbols", () => {
      const settings: RewardCalculationSettings = {
        amountSymbols: 3,
        numberRange: [1, 10],
        hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
        operations: ["+", "-", "*"],
      }
      const random = mulberry32(12344) // Fixed seed for reproducibility
      const result = generateRewardCalculation(settings, random)

      expect(result.hintFormulas.length).toBe(3)
      expect(formulaToString(result.hintFormulas[0])).toBe("6 + 6 + 6 = 18")
      expect(formulaToString(result.hintFormulas[1])).toBe("6 + 7 = 13")
      expect(formulaToString(result.hintFormulas[2])).toBe("7 + 6 + 9 = 22")
      expect(formulaToString(result.mainFormula)).toBe("7 * (9 - 6) = 21")
    })
  })

  it("generates symbol counts and mapping correctly", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
      operations: ["+", "-", "*"],
    }
    const random = mulberry32(12345) // Fixed seed for reproducibility
    const result = generateRewardCalculation(settings, random)
    const { symbolCounts, symbolMapping } = result
    expect(symbolMapping).toEqual({
      "10": "𓁧",
      "4": "𓃯",
      "5": "𓁝",
    })
    expect(symbolCounts).toEqual({
      "𓁝": 2,
      "𓁧": 6,
      "𓃯": 3,
    })
  })

  it("displays a puzzle with the correct symbols", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 3,
      numberRange: [1, 10],
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
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
      "𓁧 + 𓁧 * 𓁧 = 110
      𓃯 + 𓁧 = 14
      (𓁧 + 𓃯) - 𓁝 = 9
      (𓃯 + 𓁧) * 𓁝 = ?"
    `)
  })

  it("can generate a puzzle with high difficulty", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 5,
      numberRange: [4, 10],
      hieroglyphIds: ["𓁧", "𓃯", "𓁝", "𓁾", "𓆆"],
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
    expect(result.pickedNumbers).toEqual([6, 8, 4, 9, 10])
    expect(result.symbolMapping).toMatchInlineSnapshot(`
      {
        "10": "𓃯",
        "4": "𓁧",
        "6": "𓆆",
        "8": "𓁝",
        "9": "𓁾",
      }
    `)
    const numberFormulas = [
      ...result.hintFormulas.map((formula) =>
        formulaToString(formula, undefined, true)
      ),
      formulaToString(result.mainFormula, undefined, true),
    ].join("\n")
    expect(result.hintFormulas[3]).toMatchInlineSnapshot(`
      {
        "left": 4,
        "operation": "+",
        "result": 19,
        "right": {
          "left": 9,
          "operation": "+",
          "result": 15,
          "right": 6,
        },
      }
    `)

    expect(numberFormulas).toMatchInlineSnapshot(`
      "6 + 6 = 12
      6 + 8 = 14
      8 - 4 + 6 = 10
      4 + 9 + 6 = 19
      (9 + 4) - 10 = 3
      (10 + 8 - 4 + 6) - 9 = 11"
    `)

    expect(puzzle).toMatchInlineSnapshot(`
      "𓆆 + 𓆆 = 12
      𓆆 + 𓁝 = 14
      𓁝 - 𓁧 + 𓆆 = 10
      𓁧 + 𓁾 + 𓆆 = 19
      (𓁾 + 𓁧) - 𓃯 = 3
      (𓃯 + 𓁝 - 𓁧 + 𓆆) - 𓁾 = ?"
    `)
  })

  it("can generate a puzzle with low difficulty", () => {
    const settings: RewardCalculationSettings = {
      amountSymbols: 2,
      numberRange: [1, 4],
      hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
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
      "𓁧 + 𓁧 = 8
      𓁝 + 𓁧 + 𓁧 = 10
      𓁧 + 𓁝 = ?"
    `)
  })
})
