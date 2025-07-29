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
    expect(textFormula).toBe("6 * 9 - 7 = 47")
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
    expect(textFormula).toBe("2 * 9 * 1 = 18")
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
      expect(formulaToString(result.hintFormulas[2])).toBe("4 + 10 - 5 = 9")
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
      𓃭 + 𓂀 - 𓁼 = 9
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
    expect(result.pickedNumbers).toEqual([6, 8, 4, 9, 10])
    expect(result.symbolMapping).toMatchInlineSnapshot(`
      {
        "10": "𓇡",
        "4": "𓁼",
        "6": "𓂀",
        "8": "𓃭",
        "9": "𓃗",
      }
    `)
    // oog1 = 𓂀 = 6
    // tijger = 𓃭 = 8
    // oog2 = 𓁼 = 4
    // paard = 𓃗 = 1
    // slang = 𓇡 = 18
    const numberFormulas = [
      ...result.hintFormulas.map((formula) =>
        formulaToString(formula, undefined, true)
      ),
      formulaToString(result.mainFormula, undefined, true),
    ].join("\n")
    expect(result.hintFormulas[3]).toMatchInlineSnapshot(`
      {
        "left": 6,
        "operation": "-",
        "result": 1,
        "right": {
          "left": {
            "left": 9,
            "operation": "-",
            "result": 1,
            "right": 8,
          },
          "operation": "+",
          "result": 5,
          "right": 4,
        },
      }
    `)

    expect(numberFormulas).toMatchInlineSnapshot(`
      "6 + 6 = 12
      6 + 8 = 14
      8 + 4 + 6 = 18
      6 - (9 - 8 + 4) = 1
      4 + 9 + 6 + 10 + 8 = 37
      4 + (6 + 9 * 10) / 8 = 16"
    `)

    expect(puzzle).toMatchInlineSnapshot(`
      "𓂀 + 𓂀 = 12
      𓂀 + 𓃭 = 14
      𓃭 + 𓁼 + 𓂀 = 18
      𓂀 - (𓃗 - 𓃭 + 𓁼) = 1
      𓁼 + 𓃗 + 𓂀 + 𓇡 + 𓃭 = 37
      𓁼 + (𓂀 + 𓃗 * 𓇡) / 𓃭 = ?"
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
