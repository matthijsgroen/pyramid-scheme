import { describe, expect, it } from "vitest"
import type { PairMark, PairPuzzle } from "./pairPuzzle"
import {
  nextPairStep,
  PAIR_TECHNIQUES,
  pairStepFocus,
  pairTechniquesUpTo,
  solvePairByTechniques,
  type PairTechniqueId,
} from "./techniques"

/** A board drawn as text: `A` anchor, `P` piece, `x` ruled out, `.` open. */
const drawn = (rows: string[], rowCounts: number[], colCounts: number[]) => {
  const size = rows.length
  const cells = rows.flatMap(row => row.split(""))
  const puzzle: PairPuzzle = { size, anchors: cells.map(c => c === "A"), rowCounts, colCounts }
  const marks = cells.map((c): PairMark | undefined => (c === "P" ? "piece" : c === "x" ? "empty" : undefined))
  return { puzzle, marks }
}

const fires = (board: ReturnType<typeof drawn>, technique: PairTechniqueId) => {
  const step = nextPairStep(board.puzzle, [...board.marks])
  expect(step?.technique).toBe(technique)
  return step
}

describe("pair puzzle techniques", () => {
  it("rules out the ring around a piece", () => {
    const board = drawn(["....", ".P..", "A...", "...."], [1, 1, 1, 1], [1, 1, 1, 1])
    const step = fires(board, "touch")
    expect(step?.decisions.map(d => d.cell).sort((a, b) => a - b)).toEqual([0, 1, 2, 4, 6, 9, 10])
    expect(step?.decisions.every(d => d.mark === "empty")).toBe(true)
  })

  it("empties a line whose count is zero", () => {
    const board = drawn([".A.", "...", "..."], [0, 1, 0], [0, 1, 0])
    const step = fires(board, "zeroLine")
    expect(step?.variant).toBe("row")
    expect(step?.cells).toEqual([0, 1, 2])
    expect(step?.decisions).toEqual([
      { cell: 0, mark: "empty" },
      { cell: 2, mark: "empty" },
    ])
  })

  it("rules out a square with no anchor beside it", () => {
    const board = drawn(["A..", "...", "..."], [1, 1, 1], [1, 1, 1])
    const step = fires(board, "noAnchor")
    expect(step?.decisions).toEqual([{ cell: 2, mark: "empty" }])
  })

  it("empties the rest of a line that has its pieces", () => {
    const board = drawn(["PA.x", "xxxx", "xxxx", "xxxx"], [1, 0, 0, 0], [1, 0, 1, 0])
    const step = fires(board, "lineFull")
    expect(step?.variant).toBe("row")
    expect(step?.count).toBe(1)
    expect(step?.decisions).toEqual([{ cell: 2, mark: "empty" }])
  })

  it("fills a line down to as many squares as it owes", () => {
    const board = drawn(["A.xx", "xxxx", "xxxx", "xxxx"], [1, 0, 0, 0], [0, 1, 0, 0])
    const step = fires(board, "lineTight")
    expect(step?.variant).toBe("row")
    expect(step?.decisions).toEqual([{ cell: 1, mark: "piece" }])
  })

  it("puts an anchor's piece on its only usable square", () => {
    const board = drawn(["..AP", "Axxx", "..Ax", "xxxx"], [2, 0, 1, 0], [1, 1, 0, 1])
    const step = fires(board, "onlyWay")
    expect(step?.cells).toContain(10)
    expect(step?.decisions).toEqual([{ cell: 9, mark: "piece" }])
  })

  it("rules out a square whose only anchor already has its piece", () => {
    // The piece at 1 has no anchor but 2, so 2 is spent and 3, beside 2 alone, cannot be a piece.
    const board = drawn(["xPA..", "xxxxA", "xxx..", "APxAx", "xxxPA"], [2, 0, 1, 1, 1], [0, 2, 0, 2, 1])
    const step = fires(board, "claimed")
    expect(step?.cells).toEqual([2, 1])
    expect(step?.decisions).toEqual([{ cell: 3, mark: "empty" }])
  })

  it("does not claim an anchor a piece might not belong to", () => {
    // The piece between two anchors could be either one's, so neither is spent.
    const board = drawn(["APA.", "xxxx", "xxxx", "xxxx"], [2, 0, 0, 0], [0, 1, 0, 1])
    expect(nextPairStep(board.puzzle, [...board.marks], ["claimed"])).toBeUndefined()
  })

  it("pairs a run's surplus piece with the one anchor just outside it", () => {
    // Row 0 counts two pieces and holds one anchor; the other piece belongs to the anchor below cell 0.
    const board = drawn(["..A.", "Axxx", "..A.", "xxxx"], [2, 0, 1, 0], [1, 1, 0, 1])
    const step = fires(board, "lineBlock")
    expect(step?.variant).toBe("rowsToCols")
    expect(step?.count).toBe(1)
    expect(step?.cells).toEqual([0, 1, 2, 3])
    expect(step?.decisions).toEqual([{ cell: 0, mark: "piece" }])
  })

  it("rules out a square whose piece would leave a line too few squares", () => {
    // A piece at 5 rules out 4 and 6 beside it, and row 1 still owes a second piece.
    const board = drawn(["xxxx", "...x", "AAAx", "...x"], [0, 2, 0, 1], [1, 1, 1, 0])
    const step = fires(board, "wouldStrand")
    expect(step?.variant).toBe("row")
    expect(step?.cells).toEqual([4, 5, 6, 7])
    expect(step?.decisions).toEqual([{ cell: 5, mark: "empty" }])
  })
})

describe("pair puzzle ladder", () => {
  it("caps the ladder at a rung, inclusive", () => {
    expect(pairTechniquesUpTo("noAnchor")).toEqual(["touch", "zeroLine", "noAnchor"])
    expect(pairTechniquesUpTo("wouldStrand")).toEqual([...PAIR_TECHNIQUES])
  })

  it("focuses a step on its first decision", () => {
    expect(pairStepFocus({ technique: "touch", cells: [4], decisions: [{ cell: 1, mark: "empty" }] })).toBe(1)
  })

  it("settles a small board by deduction alone", () => {
    const { puzzle } = drawn(["A..", "...", "..A"], [1, 0, 1], [0, 2, 0])
    const result = solvePairByTechniques(puzzle)
    expect(result.settled).toBe(true)
    expect(result.marks.flatMap((m, cell) => (m === "piece" ? [cell] : []))).toEqual([1, 7])
  })
})
