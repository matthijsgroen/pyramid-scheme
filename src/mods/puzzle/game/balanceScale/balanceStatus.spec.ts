import { describe, expect, it } from "vitest"
import { computeBalanceLines, isBalanceSolved } from "./balanceStatus"
import type { Scale } from "./techniques"

const scales: Scale[] = [
  {
    left: [
      { kind: "glyph", glyph: "a" },
      { kind: "weight", value: 3 },
    ],
    right: [{ kind: "weight", value: 8 }],
  },
]

describe("computeBalanceLines", () => {
  it("tips toward the heavier pan and levels on the answer", () => {
    expect(computeBalanceLines(scales, { a: 9 })).toEqual([{ left: 12, right: 8, status: "left" }])
    expect(computeBalanceLines(scales, { a: 1 })).toEqual([{ left: 4, right: 8, status: "right" }])
    expect(computeBalanceLines(scales, { a: 5 })).toEqual([{ left: 8, right: 8, status: "level" }])
  })

  it("reads as unknown while a glyph on it has no weight — an unweighed pan is not an empty one", () => {
    expect(computeBalanceLines(scales, {})).toEqual([{ left: undefined, right: 8, status: "unknown" }])
  })
})

describe("isBalanceSolved", () => {
  it("needs every glyph weighed, not just every scale level", () => {
    const spare = ["a", "b"]
    expect(isBalanceSolved(["a"], computeBalanceLines(scales, { a: 5 }), { a: 5 })).toBe(true)
    expect(isBalanceSolved(spare, computeBalanceLines(scales, { a: 5 }), { a: 5 })).toBe(false)
    expect(isBalanceSolved(["a"], computeBalanceLines(scales, { a: 4 }), { a: 4 })).toBe(false)
  })
})
