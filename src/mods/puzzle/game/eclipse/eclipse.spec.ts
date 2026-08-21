import { describe, expect, it } from "vitest"
import {
  brokenLinks,
  canUndoEclipse,
  cellAt,
  createEclipseState,
  cycleEclipseCell,
  eclipseConflicts,
  eclipseSolved,
  lines,
  undoEclipse,
  type EclipsePuzzle,
  type Mark,
} from "./eclipse"

const SIZE = 4

/** A solved 4×4 board, written out so a test can state what it expects to see. */
// prettier-ignore
const solution: Mark[] = [
  "sun", "sun", "moon", "moon",
  "moon", "moon", "sun", "sun",
  "sun", "moon", "sun", "moon",
  "moon", "sun", "moon", "sun",
]

const puzzle = (given: (Mark | undefined)[] = solution.map(() => undefined), links: EclipsePuzzle["links"] = []) => ({
  size: SIZE,
  given,
  links,
})

const filled = (marks: (Mark | undefined)[]) => ({ marks })

describe("eclipse rules", () => {
  it("reads every row and every column as a line", () => {
    expect(lines(SIZE)).toHaveLength(SIZE * 2)
    expect(lines(SIZE)[0]).toEqual([0, 1, 2, 3])
    expect(lines(SIZE)[SIZE]).toEqual([0, 4, 8, 12])
  })

  it("accepts a board that keeps all three rules", () => {
    expect(eclipseSolved(puzzle(), filled(solution))).toBe(true)
  })

  it("refuses a full board that runs three of a mark along a line", () => {
    const marks = [...solution]
    marks[cellAt(SIZE, 0, 2)] = "sun"
    expect([...eclipseConflicts(puzzle(), filled(marks))]).toContain(cellAt(SIZE, 0, 1))
    expect(eclipseSolved(puzzle(), filled(marks))).toBe(false)
  })

  it("refuses a line holding more than half of one mark", () => {
    const marks: (Mark | undefined)[] = new Array(SIZE * SIZE).fill(undefined)
    marks[0] = "sun"
    marks[2] = "sun"
    marks[3] = "sun"
    // Not three in a row — cell 1 is still empty — so it is the balance rule that catches it.
    expect(eclipseConflicts(puzzle(), filled(marks)).size).toBeGreaterThan(0)
  })

  it("refuses a board where one finished line copies another of its kind", () => {
    // Row 2 rewritten to read like row 0. Both rows are complete, so the copy is a fact about the board.
    const marks = [...solution]
    for (let col = 0; col < SIZE; col++) marks[cellAt(SIZE, 2, col)] = solution[cellAt(SIZE, 0, col)]
    const conflicts = eclipseConflicts(puzzle(), filled(marks))
    expect(conflicts.has(cellAt(SIZE, 0, 0))).toBe(true)
    expect(conflicts.has(cellAt(SIZE, 2, 0))).toBe(true)
    expect(eclipseSolved(puzzle(), filled(marks))).toBe(false)
  })

  it("compares rows with rows only, so a row reading like a column is no conflict", () => {
    // The answer already has one: its own rows and columns are drawn from the same six patterns.
    expect(eclipseConflicts(puzzle(), filled(solution)).size).toBe(0)
  })

  it("leaves a half-filled line alone until a rule is actually broken", () => {
    const marks: (Mark | undefined)[] = new Array(SIZE * SIZE).fill(undefined)
    marks[0] = "sun"
    marks[1] = "sun"
    expect(eclipseConflicts(puzzle(), filled(marks)).size).toBe(0)
  })

  it("breaks a sign only once both its cells are filled", () => {
    const links: EclipsePuzzle["links"] = [{ a: 0, b: 1, kind: "different" }]
    expect(brokenLinks(puzzle(undefined as never, links), filled([undefined, "sun"]))).toHaveLength(0)
    expect(brokenLinks(puzzle(undefined as never, links), filled(["sun", "sun"]))).toHaveLength(1)
    expect(brokenLinks(puzzle(undefined as never, links), filled(["sun", "moon"]))).toHaveLength(0)
  })

  it("steps back one tap at a time, and stops when there is nothing to step back to", () => {
    const board = puzzle(solution.map(() => undefined))
    const start = createEclipseState(board)
    expect(canUndoEclipse(start)).toBe(false)
    expect(undoEclipse(start)).toBe(start)

    const two = cycleEclipseCell(board, cycleEclipseCell(board, start, 5), 9)
    expect(canUndoEclipse(two)).toBe(true)
    const back = undoEclipse(two)
    expect(back.marks[9]).toBeUndefined()
    expect(back.marks[5]).toBe("sun")
    // All the way back is the board it opened on, and no further.
    const empty = undoEclipse(back)
    expect(empty.marks).toEqual(start.marks)
    expect(canUndoEclipse(empty)).toBe(false)
  })

  it("has nothing to undo after a tap on a given square, because nothing happened", () => {
    const board = puzzle(solution.map((mark, index) => (index === 0 ? mark : undefined)))
    const state = createEclipseState(board)
    expect(canUndoEclipse(cycleEclipseCell(board, state, 0))).toBe(false)
  })

  it("cycles a tapped cell through both marks and back to empty, and never a given one", () => {
    const board = puzzle(solution.map((mark, index) => (index === 0 ? mark : undefined)))
    const empty = createEclipseState(board)
    const once = cycleEclipseCell(board, empty, 5)
    expect(once.marks[5]).toBe("sun")
    expect(cycleEclipseCell(board, once, 5).marks[5]).toBe("moon")
    expect(cycleEclipseCell(board, cycleEclipseCell(board, once, 5), 5).marks[5]).toBeUndefined()
    expect(cycleEclipseCell(board, empty, 0)).toBe(empty)
  })
})
