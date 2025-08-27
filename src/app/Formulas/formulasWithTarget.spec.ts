import { describe, expect, it } from "vitest"
import { findFormulaWithOptionalExtra } from "./formulasWithTarget"
import { formulaToString, type Operation } from "./formulas"
import { mulberry32 } from "@/game/random"

describe("findFormulaWithOptionalExtra", () => {
  it("finds a formula for a target using all picked numbers at least once, up to 3 times", () => {
    const random = mulberry32(12345)
    const formula = findFormulaWithOptionalExtra(
      [2, 3],
      ["+", "*"],
      [8],
      random
    )
    expect(formula).toBeTruthy()
    if (!formula) return

    expect(formulaToString(formula, undefined, "yes")).toEqual("2 + 3 + 3 = 8")
  })

  it.each<{
    picked: number[]
    allowedOps: Operation[]
    targets: number[]
    expectedResult: string
  }>([
    {
      picked: [2, 3],
      allowedOps: ["+", "*"],
      targets: [7],
      expectedResult: "2 + 2 + 3 = 7",
    },
    {
      picked: [2, 3],
      allowedOps: ["+", "*"],
      targets: [6],
      expectedResult: "2 * 3 = 6",
    },
    {
      picked: [2, 3, 4],
      allowedOps: ["+", "*"],
      targets: [14],
      expectedResult: "(3 + 4) * 2 = 14",
    },
    {
      picked: [5, 2],
      allowedOps: ["-"],
      targets: [3],
      expectedResult: "5 - 2 = 3",
    },
    {
      picked: [8, 2],
      allowedOps: ["/"],
      targets: [4],
      expectedResult: "8 / 2 = 4",
    },
    {
      picked: [2, 3],
      allowedOps: ["+"],
      targets: [10],
      expectedResult: "2 + 5 + 3 = 10",
    },
    {
      picked: [2, 3],
      allowedOps: ["*"],
      targets: [12],
      expectedResult: "2 * 2 * 3 = 12",
    },
    {
      picked: [2, 3],
      allowedOps: ["+"],
      targets: [9],
      expectedResult: "2 + 3 + 4 = 9",
    },
  ])(
    "finds a formula for one of multiple targets",
    ({ picked, allowedOps, targets, expectedResult }) => {
      const random = mulberry32(12345)
      const formula = findFormulaWithOptionalExtra(
        picked,
        allowedOps,
        targets,
        random
      )
      expect(formula).toBeTruthy()
      if (!formula) return

      expect(formulaToString(formula, undefined, "yes")).toEqual(expectedResult)
    }
  )

  it("can use an extra number if needed", () => {
    // [2, 3], target 11, allowed + only. 2+3+3+3=11 if we add 3 as extra, but must use both 2 and 3 at least once
    const random = mulberry32(12345)
    const formula = findFormulaWithOptionalExtra([2, 3], ["+"], [11], random)
    expect(formula).toBeTruthy()
    if (!formula) return

    expect(formulaToString(formula, undefined, "yes")).toEqual("2 + 3 + 6 = 11")
    expect(formula).toMatchInlineSnapshot(`
      {
        "left": {
          "left": {
            "symbol": 2,
          },
          "operation": "+",
          "result": 5,
          "right": {
            "symbol": 3,
          },
        },
        "operation": "+",
        "result": {
          "symbol": 11,
        },
        "right": 6,
      }
    `)
  })

  it("returns undefined if no formula is possible", () => {
    // [2, 3], target 100, allowed + only, can't reach 100 with 2 and 3 up to 3 times each and one extra 1-10
    const random = mulberry32(12345)
    const formula = findFormulaWithOptionalExtra([2, 3], ["+"], [100], random)
    expect(formula).toBeUndefined()
  })
})
