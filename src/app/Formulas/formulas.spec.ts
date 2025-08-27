import { describe, expect, it } from "vitest"
import { formulaToString, type Formula } from "./formulas"

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
