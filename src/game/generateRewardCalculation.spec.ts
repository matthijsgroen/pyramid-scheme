import { describe, expect, it } from "vitest"
import {
  generateRewardCalculation,
  type RewardCalculationSettings,
} from "./generateRewardCalculation"
import { mulberry32 } from "./random"
import { formulaToString } from "./formulas"

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
    expect(textFormula).toBe("5 + 10 + 10 + 4 = 29")
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
    expect(textFormula).toBe("6 + 6 * 1 - 7 = 5")
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
    expect(textFormula).toBe("6 - 1 - (7 - 6) = 4")
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
    expect(textFormula).toBe("5 + 9 - (9 - 1) = 6")
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
    expect(textFormula).toBe("6 - ((2 + 8) / 2) = 1")
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
      expect(formulaToString(result.hintFormulas[0])).toBe("6 + 6 = 12")
      expect(formulaToString(result.hintFormulas[1])).toBe("(7 - 6) * 6 = 6")
      expect(formulaToString(result.hintFormulas[2])).toBe("7 + 6 - 9 = 4")
      expect(formulaToString(result.mainFormula)).toBe("9 + 7 - (7 + 6) = 3")
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
      "𓁧 + 𓁧 = 20
      𓃯 + 𓁧 = 14
      𓁧 + 𓃯 + 𓁝 = 19
      𓁝 + 𓁧 + 𓁧 + 𓃯 = ?"
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
        "operation": "*",
        "result": 4,
        "right": {
          "left": 9,
          "operation": "-",
          "result": 1,
          "right": 8,
        },
      }
    `)

    expect(numberFormulas).toMatchInlineSnapshot(`
      "6 * 6 = 36
      6 + 8 + 6 = 20
      6 - (8 - 4) = 2
      4 * (9 - 8) = 4
      10 + 6 + 4 = 20
      9 - 4 + 8 + 9 * (10 - 6) = 49"
    `)

    expect(puzzle).toMatchInlineSnapshot(`
      "𓆆 * 𓆆 = 36
      𓆆 + 𓁝 + 𓆆 = 20
      𓆆 - (𓁝 - 𓁧) = 2
      𓁧 * (𓁾 - 𓁝) = 4
      𓃯 + 𓆆 + 𓁧 = 20
      𓁾 - 𓁧 + 𓁝 + 𓁾 * (𓃯 - 𓆆) = ?"
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
      𓁧 + 𓁝 = 6
      𓁝 + 𓁧 + 𓁧 = ?"
    `)
  })
})
