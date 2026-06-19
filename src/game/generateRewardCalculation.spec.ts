import { describe, expect, it } from "vitest"
import {
  buildTombCalculationSettings,
  generateRewardCalculation,
  type RewardCalculationSettings,
} from "./generateRewardCalculation"
import { mulberry32 } from "./random"
import { formulaToString } from "../app/Formulas/formulas"

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
    const textFormula = formulaToString(formula, undefined, "yes")
    expect(textFormula).toBe("6 + 6 + 1 + 7 = 20")
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
    const textFormula = formulaToString(formula, undefined, "yes")
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
    expect(textFormula).toBe("1 + 5 * 9 + 9 = 55")
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

      expect(result.symbolMapping).toEqual({
        "6": "𓁧",
        "7": "𓁝",
        "9": "𓃯",
      })
      expect(result.hintFormulas.length).toBe(3)
      expect(formulaToString(result.hintFormulas[0])).toBe("6 + 6 = 12")
      expect(formulaToString(result.hintFormulas[1])).toBe("6 + 1 = 7")
      expect(formulaToString(result.hintFormulas[2])).toBe("7 + 6 - 4 = 9")
      expect(formulaToString(result.mainFormula, {})).toBe("7 + 9 + 7 + 6 = 29")
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
      "𓃯": 4,
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
      ...result.hintFormulas.map(formula => formulaToString(formula, symbolMapping, "yes")),
      formulaToString(result.mainFormula, symbolMapping, "obfuscated"),
    ].join("\n")
    expect(puzzle).toMatchInlineSnapshot(`
      "𓁧 + 𓁧 = 20
      𓃯 + 𓃯 + 2 = 𓁧
      𓁝 + 𓃯 + 1 = 𓁧
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
      ...result.hintFormulas.map(formula => formulaToString(formula, symbolMapping, "yes")),
      formulaToString(result.mainFormula, symbolMapping, "obfuscated"),
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
      ...result.hintFormulas.map(formula => formulaToString(formula, undefined, "yes")),
      formulaToString(result.mainFormula, undefined, "yes"),
    ].join("\n")
    expect(result.hintFormulas[3]).toMatchInlineSnapshot(`
      {
        "left": {
          "left": {
            "symbol": 6,
          },
          "operation": "/",
          "result": 1,
          "right": {
            "symbol": 6,
          },
        },
        "operation": "+",
        "result": {
          "symbol": 9,
        },
        "right": {
          "symbol": 8,
        },
      }
    `)

    expect(numberFormulas).toMatchInlineSnapshot(`
      "6 * 6 = 36
      6 + 2 = 8
      6 - 4 + 6 = 8
      6 / 6 + 8 = 9
      6 / 6 + 9 = 10
      9 - 4 + 8 + 9 * (10 - 6) = 49"
    `)

    expect(puzzle).toMatchInlineSnapshot(`
      "𓆆 * 𓆆 = 36
      𓆆 + 2 = 𓁝
      𓆆 - 𓁧 + 𓆆 = 𓁝
      𓆆 / 𓆆 + 𓁝 = 𓁾
      𓆆 / 𓆆 + 𓁾 = 𓃯
      𓁾 - 𓁧 + 𓁝 + 𓁾 * (𓃯 - 𓆆) = ?"
    `)
  })

  describe("maxMultiplyOperandResult", () => {
    const collectMultiplyOperands = (formula: import("../app/Formulas/formulas").Formula): number[] => {
      const results: number[] = []
      const visit = (node: number | import("../app/Formulas/formulas").Formula | { symbol: number }) => {
        if (typeof node === "number" || "symbol" in node) return
        if (node.operation === "*") {
          results.push(
            typeof node.left === "number"
              ? node.left
              : "symbol" in node.left
                ? node.left.symbol
                : (visit(node.left), 0),
            typeof node.right === "number"
              ? node.right
              : "symbol" in node.right
                ? node.right.symbol
                : (visit(node.right), 0)
          )
        }
        visit(node.left)
        visit(node.right)
      }
      visit(formula)
      return results
    }

    it("constrains multiply operands across all formulas", () => {
      const max = 5
      const settings: RewardCalculationSettings = {
        amountSymbols: 3,
        numberRange: [1, 10],
        hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
        operations: ["+", "*"],
        maxMultiplyOperandResult: max,
      }
      const random = mulberry32(12345)
      const result = generateRewardCalculation(settings, random)
      const allFormulas = [result.mainFormula, ...result.hintFormulas]
      const operands = allFormulas.flatMap(collectMultiplyOperands)
      expect(operands.every(v => v <= max)).toBe(true)
    })

    it("produces different symbolCounts without the constraint", () => {
      const base: RewardCalculationSettings = {
        amountSymbols: 3,
        numberRange: [1, 10],
        hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
        operations: ["+", "*"],
      }
      const withConstraint = generateRewardCalculation({ ...base, maxMultiplyOperandResult: 5 }, mulberry32(12345))
      const withoutConstraint = generateRewardCalculation(base, mulberry32(12345))
      expect(withConstraint.symbolCounts).not.toEqual(withoutConstraint.symbolCounts)
    })
  })

  describe("buildTombCalculationSettings", () => {
    it("maps journey levelSettings and tableau to RewardCalculationSettings", () => {
      const levelSettings = {
        numberRange: [1, 10] as [number, number],
        operators: ["+", "*"] as RewardCalculationSettings["operations"],
        maxMultiplyOperandResult: 5,
      }
      const tableau = { symbolCount: 3, inventoryIds: ["𓁧", "𓃯", "𓁝"] }
      expect(buildTombCalculationSettings(levelSettings, tableau)).toEqual({
        amountSymbols: 3,
        hieroglyphIds: ["𓁧", "𓃯", "𓁝"],
        numberRange: [1, 10],
        operations: ["+", "*"],
        maxMultiplyOperandResult: 5,
      })
    })

    it("forwards undefined maxMultiplyOperandResult", () => {
      const levelSettings = {
        numberRange: [1, 10] as [number, number],
        operators: ["+"] as RewardCalculationSettings["operations"],
      }
      const tableau = { symbolCount: 2, inventoryIds: ["𓁧", "𓃯"] }
      const settings = buildTombCalculationSettings(levelSettings, tableau)
      expect(settings.maxMultiplyOperandResult).toBeUndefined()
    })
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
      ...result.hintFormulas.map(formula => formulaToString(formula, symbolMapping, "yes")),
      formulaToString(result.mainFormula, symbolMapping, "obfuscated"),
    ].join("\n")
    expect(puzzle).toMatchInlineSnapshot(`
      "𓁧 + 𓁧 = 8
      𓁝 + 𓁝 = 𓁧
      𓁝 + 𓁧 + 𓁧 = ?"
    `)
  })
})
