import { describe, expect, it } from "vitest"
import { createSumpleteState, toggleSumpleteCell } from "./sumpleteState"

describe("sumpleteState", () => {
  it("starts every cell unknown", () => {
    expect(createSumpleteState(2)).toEqual({
      cells: [
        ["unknown", "unknown"],
        ["unknown", "unknown"],
      ],
    })
  })

  it("cycles a cell unknown -> excluded -> included -> unknown", () => {
    const s0 = createSumpleteState(2)
    const s1 = toggleSumpleteCell(s0, 0, 0)
    const s2 = toggleSumpleteCell(s1, 0, 0)
    const s3 = toggleSumpleteCell(s2, 0, 0)
    expect(s1.cells[0][0]).toBe("excluded")
    expect(s2.cells[0][0]).toBe("included")
    expect(s3.cells[0][0]).toBe("unknown")
  })

  it("does not mutate the previous state", () => {
    const s0 = createSumpleteState(2)
    const s1 = toggleSumpleteCell(s0, 1, 1)
    expect(s0.cells[1][1]).toBe("unknown")
    expect(s1).not.toBe(s0)
  })
})
