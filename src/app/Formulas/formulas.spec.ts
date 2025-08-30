import { describe, expect, it } from "vitest"
import { createFormula, formulaToString, type Formula } from "./formulas"
import { mulberry32 } from "@/game/random"

describe(formulaToString, () => {
  it("convert a formula to a string numbers only", () => {
    const formula: Formula = {
      left: 1,
      right: 2,
      operation: "+",
      result: 3,
    }
    const result = formulaToString(formula, {}, "yes")
    expect(result).toBe("1 + 2 = 3")
  })

  it("convert a formula to a string with symbols", () => {
    const formula: Formula = {
      left: { symbol: 1 },
      right: { symbol: 2 },
      operation: "+",
      result: { symbol: 3 },
    }
    const result = formulaToString(formula, { 1: "A", 2: "B", 3: "C" }, "yes")
    expect(result).toBe("A + B = C")
  })
})

describe(createFormula, () => {
  it("only adds single number at most", () => {
    const random = mulberry32(123123132124)
    const formula = createFormula({ pickedNumbers: [1, 2], operations: ["+"] }, random)
    expect(formula).toEqual({
      left: { symbol: 1 },
      right: { symbol: 2 },
      operation: "+",
      result: 3,
    })
  })

  it("returns a Formula using the largest picked number as result if it fits", () => {
    const random = mulberry32(123123132124)
    const formula = createFormula({ pickedNumbers: [1, 2, 3], operations: ["+"], useResult: "allow" }, random)
    expect(formula).toMatchInlineSnapshot(`
      {
        "left": {
          "symbol": 1,
        },
        "operation": "+",
        "result": {
          "symbol": 3,
        },
        "right": {
          "symbol": 2,
        },
      }
    `)
  })
})
