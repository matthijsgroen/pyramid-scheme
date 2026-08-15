import { describe, expect, it } from "vitest"
import {
  firstMistake,
  nextStep,
  solveByTechniques,
  TECHNIQUES,
  type SumpleteMark,
  type SumpletePuzzleData,
} from "./techniques"
import { generateSumplete } from "./generateSumplete"
import { SUMPLETE_CONFIG } from "./sumpleteConfig"
import { difficulties } from "@/data/difficultyLevels"

// A one-row case, doubled: each column then holds two equal values with that value as its target, so
// "keep exactly one of these two, either will do" — the one shape no technique can decide. The
// columns stay silent and the case isolates the row technique under test. Both rows are identical and
// ties resolve to the first line, so decisions land on row 0.
const rowCase = (values: number[], rowTarget: number): SumpletePuzzleData => ({
  grid: [values, values],
  rowTargets: [rowTarget, rowTarget],
  colTargets: values,
})

const blank = (puzzle: SumpletePuzzleData): SumpleteMark[][] =>
  puzzle.grid.map(row => row.map(() => "unknown" as SumpleteMark))

describe("nextStep", () => {
  it("strikes a cell too big for what the row still needs", () => {
    const puzzle = rowCase([9, 2, 3], 5)
    expect(nextStep(puzzle, blank(puzzle))).toMatchObject({
      technique: "tooBig",
      value: 9,
      decisions: [{ row: 0, col: 0, mark: "strike" }],
    })
  })

  it("keeps everything when the whole row is needed", () => {
    const puzzle = rowCase([4, 2, 3], 9)
    const step = nextStep(puzzle, blank(puzzle))
    expect(step?.technique).toBe("allKeep")
    expect(step?.decisions.every(decision => decision.mark === "keep")).toBe(true)
  })

  it("strikes everything left once the target is already reached", () => {
    const puzzle = rowCase([4, 2, 3], 4)
    const marks = blank(puzzle)
    marks[0][0] = "keep"
    expect(nextStep(puzzle, marks)).toMatchObject({
      technique: "allStrike",
      decisions: [
        { row: 0, col: 1, mark: "strike" },
        { row: 0, col: 2, mark: "strike" },
      ],
    })
  })

  it("keeps the lone odd number when the target is odd", () => {
    const puzzle = rowCase([3, 2, 4, 6], 7)
    expect(nextStep(puzzle, blank(puzzle))).toMatchObject({
      technique: "parity",
      value: 3,
      decisions: [{ row: 0, col: 0, mark: "keep" }],
    })
  })

  it("strikes the lone odd number when the target is even", () => {
    const puzzle = rowCase([3, 2, 4, 6], 8)
    expect(nextStep(puzzle, blank(puzzle))).toMatchObject({
      technique: "parity",
      value: 3,
      decisions: [{ row: 0, col: 0, mark: "strike" }],
    })
  })

  it("takes the only combination that reaches the target", () => {
    // 8 is 6+2 and nothing else; two odd values keep parity quiet.
    const puzzle = rowCase([6, 2, 5, 7], 8)
    expect(nextStep(puzzle, blank(puzzle))).toMatchObject({
      technique: "onlyCombination",
      decisions: [
        { row: 0, col: 0, mark: "keep" },
        { row: 0, col: 1, mark: "keep" },
        { row: 0, col: 2, mark: "strike" },
        { row: 0, col: 3, mark: "strike" },
      ],
    })
  })

  it("does not treat interchangeable equal values as a forced combination", () => {
    // 4 is either 4, so those two cells stay open — but the 9 is still decidable.
    const puzzle = rowCase([4, 4, 9], 4)
    expect(nextStep(puzzle, blank(puzzle))).toMatchObject({
      technique: "tooBig",
      decisions: [{ row: 0, col: 2, mark: "strike" }],
    })
  })

  it("decides a cell that every remaining combination shares", () => {
    // 10 is 6+4 or 6+3+1 — never without the 6.
    const puzzle = rowCase([6, 4, 3, 1], 10)
    expect(nextStep(puzzle, blank(puzzle))).toMatchObject({
      technique: "inEveryCombination",
      decisions: [{ row: 0, col: 0, mark: "keep" }],
    })
  })

  it("reports the smallest deficit among lines the same technique fires on", () => {
    const puzzle: SumpletePuzzleData = {
      grid: [
        [9, 2, 4],
        [9, 2, 4],
      ],
      rowTargets: [6, 2],
      colTargets: [9, 2, 4],
    }
    expect(nextStep(puzzle, blank(puzzle))).toMatchObject({ technique: "tooBig", line: "row", index: 1, deficit: 2 })
  })

  it("stays silent on a line the player over-filled", () => {
    const puzzle = rowCase([6, 6, 2], 8)
    const marks = puzzle.grid.map(() => ["keep", "keep", "unknown"] as SumpleteMark[])
    expect(nextStep(puzzle, marks)).toBeUndefined()
  })

  it("respects the technique cap", () => {
    const puzzle = rowCase([6, 4, 3, 1], 10)
    expect(nextStep(puzzle, blank(puzzle))?.technique).toBe("inEveryCombination")
    expect(nextStep(puzzle, blank(puzzle), "onlyCombination")).toBeUndefined()
  })
})

describe("firstMistake", () => {
  const solution = [[true, false]]

  it("finds a mark that contradicts the answer", () => {
    expect(firstMistake([["strike", "unknown"]], solution)).toEqual({ row: 0, col: 0 })
  })

  it("ignores undecided cells", () => {
    expect(firstMistake([["unknown", "unknown"]], solution)).toBeUndefined()
  })

  it("accepts correct marks", () => {
    expect(firstMistake([["keep", "strike"]], solution)).toBeUndefined()
  })
})

describe("solveByTechniques", () => {
  it("reports the strongest technique a board demanded", () => {
    const board = generateSumplete(SUMPLETE_CONFIG.starter.size, 7, SUMPLETE_CONFIG.starter)
    const { deepest } = solveByTechniques(board, board.techniqueCap)
    expect(TECHNIQUES.indexOf(deepest!)).toBeLessThanOrEqual(TECHNIQUES.indexOf("parity"))
  })

  it("leaves a guessable board unsettled rather than guessing", () => {
    const { settled, steps } = solveByTechniques(rowCase([4, 4], 4))
    expect(settled).toBe(false)
    expect(steps).toEqual([])
  })
})

describe("every technique", () => {
  it("is reachable — each one fires on a real board", () => {
    const fired = new Set<string>()
    for (const difficulty of difficulties) {
      const { size, ...options } = SUMPLETE_CONFIG[difficulty]
      for (let seed = 1; seed <= 20; seed++) {
        const board = generateSumplete(size, seed, options)
        for (const step of solveByTechniques(board, board.techniqueCap).steps) fired.add(step.technique)
      }
    }
    expect([...TECHNIQUES].filter(technique => !fired.has(technique))).toEqual([])
  })
})
