import { describe, expect, it } from "vitest"
import {
  generateCompareLevel,
  type CompareLevelSettings,
} from "./generateCompareLevel"
import { mulberry32 } from "./random"

describe(generateCompareLevel, () => {
  it("generates a set of compare formulas", () => {
    const random = mulberry32(12345)
    const settings: CompareLevelSettings = {
      numberRange: [1, 10],
      operators: ["+", "-"],
      compareAmount: 3,
    }
    const level = generateCompareLevel(
      settings,
      { digit: 5, largest: "always" },
      random
    )
    expect(level).toMatchInlineSnapshot(`
      {
        "comparisons": [
          {
            "left": {
              "left": 10,
              "operation": "+",
              "result": 15,
              "right": 5,
            },
            "right": {
              "left": 10,
              "operation": "-",
              "result": 5,
              "right": 5,
            },
          },
          {
            "left": {
              "left": 10,
              "operation": "+",
              "result": 15,
              "right": 5,
            },
            "right": {
              "left": 10,
              "operation": "-",
              "result": 5,
              "right": 5,
            },
          },
          {
            "left": {
              "left": 10,
              "operation": "+",
              "result": 15,
              "right": 5,
            },
            "right": {
              "left": 10,
              "operation": "-",
              "result": 5,
              "right": 5,
            },
          },
        ],
        "requirements": {
          "digit": 5,
          "largest": "always",
        },
      }
    `)
  })

  describe("dealing with requirements", () => {
    it.todo("specific digit on largest side and never on smallest side")
    it.todo("specific digit on smallest side and never on largest side")
  })
})
