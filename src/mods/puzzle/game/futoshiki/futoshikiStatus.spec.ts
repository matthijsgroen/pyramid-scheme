import { describe, expect, it } from "vitest"
import { futoshikiConflicts, isFutoshikiSolved, strandedNotes } from "./futoshikiStatus"
import type { FutoshikiPuzzleData, FutoshikiValues } from "./techniques"

const puzzle: FutoshikiPuzzleData = {
  size: 3,
  givens: [
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
  ],
  // The top-left square is smaller than the one to its right.
  constraints: [{ row: 0, col: 0, direction: "right", relation: "<" }],
}

const answer: FutoshikiValues = [
  [1, 2, 3],
  [2, 3, 1],
  [3, 1, 2],
]

describe("futoshikiConflicts", () => {
  it("marks both squares of a number repeated in a row", () => {
    const values: FutoshikiValues = [
      [1, 1, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]
    expect([...futoshikiConflicts(puzzle, values).cells]).toEqual(["0,0", "0,1"])
  })

  it("marks both squares of a number repeated in a column", () => {
    const values: FutoshikiValues = [
      [1, undefined, undefined],
      [undefined, undefined, undefined],
      [1, undefined, undefined],
    ]
    expect([...futoshikiConflicts(puzzle, values).cells]).toEqual(["0,0", "2,0"])
  })

  it("marks a sign the two numbers beside it read the wrong way round", () => {
    const values: FutoshikiValues = [
      [3, 2, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]
    expect([...futoshikiConflicts(puzzle, values).constraints]).toEqual([0])
  })

  it("says nothing about a sign with only one number beside it", () => {
    const values: FutoshikiValues = [
      [3, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]
    expect(futoshikiConflicts(puzzle, values).constraints.size).toBe(0)
  })
})

describe("isFutoshikiSolved", () => {
  it("accepts a full grid with no repeat and every sign holding", () => {
    expect(isFutoshikiSolved(puzzle, answer)).toBe(true)
  })

  it("rejects a grid with an empty square, however correct the rest is", () => {
    const partial = answer.map(row => [...row])
    partial[2][2] = undefined
    expect(isFutoshikiSolved(puzzle, partial)).toBe(false)
  })

  it("rejects a full grid that repeats nothing but reads a sign the wrong way round", () => {
    const flipped: FutoshikiValues = [
      [3, 1, 2],
      [1, 2, 3],
      [2, 3, 1],
    ]
    expect(futoshikiConflicts(puzzle, flipped).cells.size).toBe(0)
    expect(isFutoshikiSolved(puzzle, flipped)).toBe(false)
  })
})

describe("strandedNotes", () => {
  const notesOf = (entries: Record<string, number[]>) =>
    Array.from({ length: 3 }, (_, row) => Array.from({ length: 3 }, (_, col) => entries[`${row},${col}`] ?? []))

  it("marks a note the same number placed in its row has ruled out", () => {
    const values: FutoshikiValues = [
      [1, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]
    expect([...strandedNotes(puzzle, values, notesOf({ "0,2": [1, 2] }))]).toEqual(["0,2,1"])
  })

  it("marks a note the same number placed in its column has ruled out", () => {
    const values: FutoshikiValues = [
      [1, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]
    expect([...strandedNotes(puzzle, values, notesOf({ "2,0": [1] }))]).toEqual(["2,0,1"])
  })

  it("leaves a note alone when the number that ruled it out is taken back off the board", () => {
    const notes = notesOf({ "0,2": [1] })
    const placed: FutoshikiValues = [
      [1, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]
    expect(strandedNotes(puzzle, placed, notes).size).toBe(1)
    const corrected: FutoshikiValues = [
      [2, undefined, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]
    expect(strandedNotes(puzzle, corrected, notes).size).toBe(0)
  })

  it("says nothing about notes under a square that already holds a number", () => {
    const values: FutoshikiValues = [
      [1, 2, undefined],
      [undefined, undefined, undefined],
      [undefined, undefined, undefined],
    ]
    expect(strandedNotes(puzzle, values, notesOf({ "0,1": [1] })).size).toBe(0)
  })
})
