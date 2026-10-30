import { describe, expect, it } from "vitest"
import {
  canUndoPair,
  createPairState,
  cyclePairCell,
  firstPairMistake,
  hasPerfectPairing,
  lineStatus,
  pairConflicts,
  pairSolved,
  ruledOutByPieces,
  sweepPairCells,
  undoPair,
  type PairMark,
  type PairPuzzle,
} from "./pairPuzzle"

const anchorsAt = (size: number, cells: number[]) => Array.from({ length: size * size }, (_u, i) => cells.includes(i))

const board: PairPuzzle = {
  size: 4,
  anchors: anchorsAt(4, [1, 11]),
  rowCounts: [1, 0, 0, 1],
  colCounts: [1, 0, 0, 1],
}

const sharedAnchorBoard: PairPuzzle = { ...board, rowCounts: [2, 0, 0, 0], colCounts: [1, 0, 1, 0] }

const withPieces = (cells: number[]) => ({
  marks: Array.from({ length: 16 }, (_u, i): PairMark | undefined => (cells.includes(i) ? "piece" : undefined)),
  past: [],
})

describe("pair puzzle", () => {
  it("a board with one piece beside each anchor is solved", () => {
    expect(pairSolved(board, withPieces([0, 15]))).toBe(true)
  })

  it("two pieces sharing one anchor are not solved", () => {
    expect(pairSolved(sharedAnchorBoard, withPieces([0, 2]))).toBe(false)
  })

  it("a perfect pairing needs every anchor used once", () => {
    const pieces = (cells: number[]) => Array.from({ length: 16 }, (_u, i) => cells.includes(i))
    expect(hasPerfectPairing(board, pieces([0, 15]))).toBe(true)
    expect(hasPerfectPairing(board, pieces([0, 2]))).toBe(false)
  })

  it("a tap on an anchor changes nothing", () => {
    const s = createPairState(board)
    expect(cyclePairCell(s, 1, board)).toBe(s)
  })

  it("a tap cycles empty, piece, open", () => {
    const s0 = createPairState(board)
    const s1 = cyclePairCell(s0, 0, board)
    const s2 = cyclePairCell(s1, 0, board)
    const s3 = cyclePairCell(s2, 0, board)
    expect([s1.marks[0], s2.marks[0], s3.marks[0]]).toEqual(["empty", "piece", undefined])
  })

  it("a sweep marks open cells empty in one undo step and skips anchors", () => {
    const s = sweepPairCells(createPairState(board), [0, 1, 2], board)
    expect([s.marks[0], s.marks[1], s.marks[2]]).toEqual(["empty", undefined, "empty"])
    expect(undoPair(s).marks[0]).toBeUndefined()
    expect(canUndoPair(s)).toBe(true)
    expect(canUndoPair(undoPair(s))).toBe(false)
    expect(sweepPairCells(s, [0, 1], board)).toBe(s)
  })

  it("touching pieces conflict, corners included", () => {
    const conflicts = pairConflicts(board, withPieces([5, 10]))
    expect(conflicts.has(5)).toBe(true)
    expect(conflicts.has(10)).toBe(true)
  })

  it("a piece with no orthogonal anchor conflicts", () => {
    expect(pairConflicts(board, withPieces([12])).has(12)).toBe(true)
  })

  it("a line past its count is broken", () => {
    expect(lineStatus(board, withPieces([0, 2]).marks).rows[0]).toBe("broken")
    expect(pairConflicts(board, withPieces([0, 2])).has(0)).toBe(true)
  })

  it("a line with too few cells left is broken, an exact one is met", () => {
    const marks = withPieces([]).marks.map((m, i) => (i < 4 ? "empty" : m)) as (PairMark | undefined)[]
    expect(lineStatus(board, marks).rows[0]).toBe("broken")
    expect(lineStatus(board, withPieces([0]).marks).rows[0]).toBe("met")
    expect(lineStatus(board, withPieces([]).marks).rows[0]).toBe("open")
  })

  it("a piece rules out its eight neighbours but never an anchor", () => {
    const out = ruledOutByPieces(board, withPieces([5]).marks)
    expect(out.has(1)).toBe(false)
    expect(out.has(10)).toBe(true)
    expect(out.has(0)).toBe(true)
    expect(out.has(5)).toBe(false)
  })

  it("touching pieces and marked cells are not ruled out", () => {
    const marks = withPieces([5, 10]).marks.map((m, i) => (i === 0 ? "empty" : m)) as (PairMark | undefined)[]
    const out = ruledOutByPieces(board, marks)
    expect([out.has(5), out.has(10), out.has(0)]).toEqual([false, false, false])
  })

  it("the first mistake is a wrong piece or a wrong empty", () => {
    const solution = Array.from({ length: 16 }, (_u, i) => i === 0 || i === 15)
    expect(firstPairMistake(withPieces([0, 15]).marks, solution)).toBeUndefined()
    expect(firstPairMistake(withPieces([0, 5]).marks, solution)).toBe(5)
    expect(firstPairMistake(["empty", ...new Array(15).fill(undefined)], solution)).toBe(0)
  })
})
