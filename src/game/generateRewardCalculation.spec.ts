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
    expect(textFormula).toBe("(5 * 10) - 4 = 46")
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
    expect(textFormula).toBe("(6 + 7) * 1 = 13")
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
    expect(textFormula).toBe("(6 + 7) * 1 = 13")
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
    expect(textFormula).toBe("6 * (9 - 7) = 12")
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
    expect(textFormula).toBe("(2 - 1) * 9 = 9")
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
      expect(formulaToString(result.hintFormulas[0])).toBe("10 * 10 = 100")
      expect(formulaToString(result.hintFormulas[1])).toBe("4 + 10 = 14")
      expect(formulaToString(result.hintFormulas[2])).toBe("(5 + 10) - 4 = 11")
      expect(formulaToString(result.mainFormula)).toBe("(5 * 10) - 4 = 46")
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
      "10": "𓁧",
      "4": "𓃯",
      "5": "𓁝",
    })
    expect(symbolCounts).toEqual({
      "𓁝": 2,
      "𓁧": 5,
      "𓃯": 3,
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
      "𓁧 * 𓁧 = 100
      𓃯 + 𓁧 = 14
      (𓁝 + 𓁧) - 𓃯 = 11
      (𓁝 * 𓁧) - 𓃯 = ?"
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
    expect(result.pickedNumbers).toEqual([6, 8, 4, 9, 10])
    expect(result.symbolMapping).toMatchInlineSnapshot(`
      {
        "10": "𓆆",
        "4": "𓁝",
        "6": "𓁧",
        "8": "𓃯",
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
        "result": 5,
        "right": {
          "left": 9,
          "operation": "-",
          "result": 1,
          "right": 8,
        },
      }
    `)

    expect(numberFormulas).toMatchInlineSnapshot(`
      "6 + 6 = 12
      6 + 8 = 14
      6 - 4 + 8 = 10
      4 + 9 - 8 = 5
      (10 - 6) / 4 = 1
      6 * (9 + 10) * 8 + 4 = 916"
    `)

    expect(puzzle).toMatchInlineSnapshot(`
      "𓁧 + 𓁧 = 12
      𓁧 + 𓃯 = 14
      𓁧 - 𓁝 + 𓃯 = 10
      𓁝 + 𓁾 - 𓃯 = 5
      (𓆆 - 𓁧) / 𓁝 = 1
      𓁧 * (𓁾 + 𓆆) * 𓃯 + 𓁝 = ?"
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
      "𓁧 + 𓁧 + 𓁧 = 12
      𓁧 + 𓃯 + 𓁧 = 10
      𓃯 + 𓁧 + 𓃯 = ?"
    `)
  })
})
