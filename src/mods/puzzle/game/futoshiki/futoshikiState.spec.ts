import { describe, expect, it } from "vitest"
import {
  canUndoFutoshiki,
  clearFutoshikiCell,
  createFutoshikiState,
  futoshikiValues,
  setFutoshikiValue,
  toggleFutoshikiNote,
  undoFutoshikiMove,
} from "./futoshikiState"
import type { FutoshikiPuzzleData } from "./techniques"

const puzzle: FutoshikiPuzzleData = {
  size: 3,
  givens: [
    [2, undefined, undefined],
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
  ],
  constraints: [],
}

describe("createFutoshikiState", () => {
  it("shows the pre-filled numbers and marks them as part of the puzzle", () => {
    const state = createFutoshikiState(puzzle)
    expect(state.cells[0][0]).toEqual({ value: 2, notes: [], given: true })
    expect(state.cells[1][1]).toEqual({ value: undefined, notes: [], given: false })
  })
})

describe("setFutoshikiValue", () => {
  it("writes a number into an empty square", () => {
    const state = setFutoshikiValue(createFutoshikiState(puzzle), 1, 1, 3)
    expect(state.cells[1][1].value).toBe(3)
  })

  it("the same number again takes it back out", () => {
    const written = setFutoshikiValue(createFutoshikiState(puzzle), 1, 1, 3)
    expect(setFutoshikiValue(written, 1, 1, 3).cells[1][1].value).toBeUndefined()
  })

  it("leaves a pre-filled square alone", () => {
    const state = setFutoshikiValue(createFutoshikiState(puzzle), 0, 0, 1)
    expect(state.cells[0][0].value).toBe(2)
    expect(canUndoFutoshiki(state)).toBe(false)
  })

  it("leaves every note where it is — a placement is not allowed to spend the player's work", () => {
    let state = createFutoshikiState(puzzle)
    state = toggleFutoshikiNote(state, 1, 2, 3)
    state = toggleFutoshikiNote(state, 2, 1, 3)
    state = setFutoshikiValue(state, 1, 1, 3)
    expect(state.cells[1][2].notes).toEqual([3])
    expect(state.cells[2][1].notes).toEqual([3])
  })

  it("keeps the square's own notes, so taking the number back out uncovers them again", () => {
    let state = toggleFutoshikiNote(createFutoshikiState(puzzle), 1, 1, 1)
    state = setFutoshikiValue(state, 1, 1, 3)
    expect(state.cells[1][1].notes).toEqual([1])
    expect(setFutoshikiValue(state, 1, 1, 3).cells[1][1]).toEqual({ value: undefined, notes: [1], given: false })
  })

  it("survives a correction: writing a different number over a wrong one keeps the notes intact", () => {
    let state = toggleFutoshikiNote(createFutoshikiState(puzzle), 1, 2, 3)
    state = setFutoshikiValue(state, 1, 1, 3)
    state = setFutoshikiValue(state, 1, 1, 2)
    expect(state.cells[1][2].notes).toEqual([3])
  })
})

describe("toggleFutoshikiNote", () => {
  it("pencils a number in and rubs it out again", () => {
    const written = toggleFutoshikiNote(createFutoshikiState(puzzle), 1, 1, 2)
    expect(written.cells[1][1].notes).toEqual([2])
    expect(toggleFutoshikiNote(written, 1, 1, 2).cells[1][1].notes).toEqual([])
  })

  it("keeps the notes in order however they were entered", () => {
    let state = toggleFutoshikiNote(createFutoshikiState(puzzle), 1, 1, 3)
    state = toggleFutoshikiNote(state, 1, 1, 1)
    expect(state.cells[1][1].notes).toEqual([1, 3])
  })

  it("leaves a square that already holds a number alone", () => {
    const state = toggleFutoshikiNote(setFutoshikiValue(createFutoshikiState(puzzle), 1, 1, 3), 1, 1, 2)
    expect(state.cells[1][1].notes).toEqual([])
  })
})

describe("clearFutoshikiCell", () => {
  it("empties a square of both its number and its notes", () => {
    let state = toggleFutoshikiNote(createFutoshikiState(puzzle), 1, 1, 2)
    state = clearFutoshikiCell(state, 1, 1)
    expect(state.cells[1][1]).toEqual({ value: undefined, notes: [], given: false })
  })

  it("records nothing for a square that was already empty", () => {
    expect(canUndoFutoshiki(clearFutoshikiCell(createFutoshikiState(puzzle), 1, 1))).toBe(false)
  })
})

describe("undoFutoshikiMove", () => {
  it("takes back the last move", () => {
    let state = setFutoshikiValue(createFutoshikiState(puzzle), 1, 1, 3)
    state = undoFutoshikiMove(state)
    expect(state.cells[1][1].value).toBeUndefined()
    expect(canUndoFutoshiki(state)).toBe(false)
  })

  it("walks back move by move, in the order they were made", () => {
    let state = setFutoshikiValue(createFutoshikiState(puzzle), 1, 1, 3)
    state = setFutoshikiValue(state, 2, 2, 1)
    state = undoFutoshikiMove(state)
    expect(futoshikiValues(state)[2][2]).toBeUndefined()
    expect(futoshikiValues(state)[1][1]).toBe(3)
    expect(futoshikiValues(undoFutoshikiMove(state))[1][1]).toBeUndefined()
  })

  it("does nothing on an untouched board", () => {
    const state = createFutoshikiState(puzzle)
    expect(undoFutoshikiMove(state).cells).toEqual(state.cells)
  })
})
