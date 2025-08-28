import { describe, expect, it } from "vitest"
import {
  generateCompareLevel,
  type CompareLevel,
  type CompareLevelSettings,
} from "./generateCompareLevel"
import { mulberry32 } from "./random"
import { formulaToString } from "../app/Formulas/formulas"

describe(generateCompareLevel, () => {
  const stringifyCompare = (level: CompareLevel) =>
    level.comparisons.map(
      (f) =>
        `${formulaToString(f.left)} ${f.left.result > f.right.result ? ">" : "<"} ${formulaToString(f.right)}`
    )

  const resultToValue = (result: number | { symbol: number }) =>
    typeof result === "number" ? result : result.symbol

  const collectAnswers = (
    side: "largest" | "smallest",
    level: CompareLevel
  ) => {
    return level.comparisons.map((c) => {
      const formulas = [c.left, c.right].sort(
        (a, b) => resultToValue(a.result) - resultToValue(b.result)
      )
      const formula = side === "largest" ? formulas[1] : formulas[0]
      return resultToValue(formula.result)
    })
  }

  const allContain = (answers: number[], digit: number) =>
    answers.every((x) => String(x).includes(String(digit)))

  const neverContain = (answers: number[], digit: number) =>
    !answers.some((x) => String(x).includes(String(digit)))

  it("generates a set of compare formulas", () => {
    const random = mulberry32(12345)
    const settings: CompareLevelSettings = {
      numberOfSymbols: 2,
      numberRange: [1, 10],
      operators: ["+", "-"],
      compareAmount: 3,
    }
    const level = generateCompareLevel(
      settings,
      { digit: 5, largest: "always" },
      random
    )
    expect(level.requirements).toEqual({
      digit: 5,
      largest: "always",
    })
    expect(stringifyCompare(level)).toMatchInlineSnapshot(`
      [
        "4 + 3 = 7 < 10 + 5 = 15",
        "8 + 7 = 15 > 2 + 2 = 4",
        "6 + 9 = 15 > 3 + 7 = 10",
      ]
    `)
  })

  describe("dealing with requirements", () => {
    it("specific digit on largest side and never on smallest side", () => {
      const random = mulberry32(12345)
      const settings: CompareLevelSettings = {
        numberOfSymbols: 3,
        numberRange: [1, 10],
        operators: ["+", "-"],
        compareAmount: 3,
      }
      const level = generateCompareLevel(
        settings,
        { digit: 5, largest: "always" },
        random
      )

      expect(level.requirements).toEqual({
        digit: 5,
        largest: "always",
      })
      expect(stringifyCompare(level)).toMatchInlineSnapshot(`
        [
          "5 + 6 - 8 = 3 < 3 + 7 + 5 = 15",
          "8 - 2 - 3 = 3 < 10 + 9 - 4 = 15",
          "1 + 8 - 1 = 8 < 5 + 10 + 10 = 25",
        ]
      `)

      expect(allContain(collectAnswers("largest", level), 5)).toBe(true)
      expect(neverContain(collectAnswers("smallest", level), 5)).toBe(true)
    })

    it("specific digit on smallest side and never on largest side", () => {
      const random = mulberry32(12345)
      const settings: CompareLevelSettings = {
        numberOfSymbols: 3,
        numberRange: [1, 10],
        operators: ["+", "-"],
        compareAmount: 3,
      }
      const level = generateCompareLevel(
        settings,
        { digit: 8, largest: "never" },
        random
      )

      expect(level.requirements).toEqual({
        digit: 8,
        largest: "never",
      })
      expect(stringifyCompare(level)).toMatchInlineSnapshot(`
        [
          "4 + 5 + 9 = 18 < 4 + 8 + 9 = 21",
          "9 + 4 + 1 + 6 + 5 + 6 = 31 > 2 + 6 + 10 + 1 - (2 + 9) = 8",
          "8 + 3 + 8 = 19 > 10 - (1 + 1) = 8",
        ]
      `)

      expect(allContain(collectAnswers("smallest", level), 8)).toBe(true)
      expect(neverContain(collectAnswers("largest", level), 8)).toBe(true)
    })
  })
})
