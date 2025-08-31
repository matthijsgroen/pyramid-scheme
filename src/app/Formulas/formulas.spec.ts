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

  describe("adding parenthesis", () => {
    describe("for subtractions", () => {
      it("does not add parenthesis when simple symbols", () => {
        const formula: Formula = {
          left: { symbol: 3 },
          right: { symbol: 2 },
          operation: "-",
          result: { symbol: 1 },
        }
        const result = formulaToString(formula, { 1: "C", 2: "B", 3: "A" }, "yes")
        expect(result).toBe("A - B = C")
      })

      it("does not add parenthesis when simple numbers", () => {
        const formula: Formula = {
          left: 3,
          right: 2,
          operation: "-",
          result: 1,
        }
        const result = formulaToString(formula, { 1: "A", 2: "B", 3: "C" }, "yes")
        expect(result).toBe("3 - 2 = 1")
      })

      it("does add parenthesis when subcalculations are involved", () => {
        const formula: Formula = {
          left: 20,
          right: {
            left: 15,
            right: 4,
            operation: "-",
            result: 11,
          },
          operation: "-",
          result: 9,
        }
        const result = formulaToString(formula, { 1: "A", 2: "B", 3: "C" }, "yes")
        expect(result).toBe("20 - (15 - 4) = 9")
      })
    })

    describe("operator precedence", () => {
      it("does not add parenthesis when not needed multiplication", () => {
        const formula: Formula = {
          left: {
            left: 3,
            right: 5,
            operation: "*",
            result: 15,
          },
          right: 2,
          operation: "+",
          result: 17,
        }
        const result = formulaToString(formula, { 1: "A", 2: "B", 3: "C" }, "yes")
        expect(result).toBe("3 * 5 + 2 = 17")
      })

      it("does not add parenthesis when not needed addition / subtraction", () => {
        const formula: Formula = {
          left: {
            left: 3,
            right: 5,
            operation: "+",
            result: 8,
          },
          right: 2,
          operation: "-",
          result: 6,
        }
        const result = formulaToString(formula, { 1: "A", 2: "B", 3: "C" }, "yes")
        expect(result).toBe("3 + 5 - 2 = 6")
      })

      it("does add parenthesis when needed", () => {
        const formula: Formula = {
          left: {
            left: 2,
            right: 3,
            operation: "+",
            result: 5,
          },
          right: 5,
          operation: "*",
          result: 25,
        }
        const result = formulaToString(formula, { 1: "A", 2: "B", 3: "C" }, "yes")
        expect(result).toBe("(2 + 3) * 5 = 25")
      })
    })
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
