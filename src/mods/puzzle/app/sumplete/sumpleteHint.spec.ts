import { describe, expect, it } from "vitest"
import { buildSumpleteHint } from "./sumpleteHint"
import type { SumpleteMark } from "@/mods/puzzle/game/sumplete/techniques"

// Row 0 needs 5 and holds a 9 that cannot fit; the doubled row and matching column targets keep the
// columns silent (see techniques.spec.ts).
const puzzle = {
  grid: [
    [9, 2, 3],
    [9, 2, 3],
  ],
  rowTargets: [5, 5],
  colTargets: [9, 2, 3],
}
const solution = [
  [false, true, true],
  [false, true, true],
]

const blank = (): SumpleteMark[][] => puzzle.grid.map(row => row.map(() => "unknown" as SumpleteMark))

describe("buildSumpleteHint", () => {
  it("names the technique and the numbers its sentence needs", () => {
    expect(buildSumpleteHint(puzzle, blank(), solution, "inEveryCombination")).toMatchObject({
      key: "tooBig",
      params: { deficit: 5, value: 9 },
      line: { kind: "row", index: 0 },
    })
  })

  it("points at the cells the player should look at", () => {
    expect(buildSumpleteHint(puzzle, blank(), solution, "inEveryCombination")?.cells).toEqual(new Set(["0,0"]))
  })

  it("calls out a wrong mark before anything else — deductions past one are advice toward a dead end", () => {
    const marks = blank()
    marks[0][1] = "strike"
    expect(buildSumpleteHint(puzzle, marks, solution, "inEveryCombination")).toMatchObject({
      key: "mistake",
      cells: new Set(["0,1"]),
    })
  })

  it("splits parity by which way it decides, since the two reasons read differently", () => {
    const values = [3, 2, 4, 6]
    const odd = { grid: [values, values], rowTargets: [7, 7], colTargets: values }
    const even = { ...odd, rowTargets: [8, 8] }
    const marks: SumpleteMark[][] = [values.map(() => "unknown"), values.map(() => "unknown")]
    const kept = [
      [true, true, false, false],
      [true, true, false, false],
    ]
    expect(buildSumpleteHint(odd, marks, kept, "parity")?.key).toBe("parityKeep")
    const struck = [
      [false, true, false, true],
      [false, true, false, true],
    ]
    expect(buildSumpleteHint(even, marks, struck, "parity")?.key).toBe("parityStrike")
  })

  it("says nothing when the cap leaves nothing forced", () => {
    // 10 is 6+4 or 6+3+1: only the last technique in the ladder decides anything here.
    const values = [6, 4, 3, 1]
    const combinations = { grid: [values, values], rowTargets: [10, 10], colTargets: values }
    const marks: SumpleteMark[][] = [values.map(() => "unknown"), values.map(() => "unknown")]
    const answer = [
      [true, true, false, false],
      [true, true, false, false],
    ]
    expect(buildSumpleteHint(combinations, marks, answer, "inEveryCombination")?.key).toBe("inEveryCombination")
    expect(buildSumpleteHint(combinations, marks, answer, "onlyCombination")).toBeUndefined()
  })
})
