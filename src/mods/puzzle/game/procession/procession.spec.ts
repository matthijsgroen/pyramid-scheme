import { describe, expect, it } from "vitest"
import {
  brokenMarks,
  createProcessionState,
  markHolds,
  processionSolved,
  slideBar,
  type ProcessionPuzzle,
} from "./procession"

/** Three bars in a ten-tick day, with one mark of every kind that joins two rows. */
const board: ProcessionPuzzle = {
  ticks: 10,
  bars: [
    { len: 3, start: 0 },
    { len: 2, start: 4 },
    { len: 2, start: 8 },
  ],
  marks: [
    { kind: "pin", a: 0, tick: 0 },
    { kind: "link", a: 0, b: 1, gap: 1 },
    { kind: "before", a: 1, b: 2 },
    { kind: "apart", a: 0, b: 2 },
    { kind: "together", a: 1, b: 1 },
    { kind: "span", ticks: 10 },
  ],
}

describe("a day and the things in it", () => {
  it("holds every mark where the bars stand", () => {
    expect(processionSolved(board, createProcessionState(board))).toBe(true)
    expect(brokenMarks(board, createProcessionState(board))).toEqual([])
  })

  it("counts a link from the end of one bar to the start of the next", () => {
    const starts = [0, 4, 8]
    expect(markHolds(board, starts, { kind: "link", a: 0, b: 1, gap: 1 })).toBe(true)
    // The gap is measured from where the first bar ENDS, so a bar one tick longer moves the answer along.
    expect(
      markHolds({ ...board, bars: [{ len: 4, start: 0 }, ...board.bars.slice(1)] }, starts, {
        kind: "link",
        a: 0,
        b: 1,
        gap: 1,
      })
    ).toBe(false)
  })

  it("reads apart in either order and together in neither", () => {
    expect(markHolds(board, [0, 4, 8], { kind: "apart", a: 0, b: 1 })).toBe(true)
    expect(markHolds(board, [4, 0, 8], { kind: "apart", a: 0, b: 1 })).toBe(true)
    expect(markHolds(board, [0, 2, 8], { kind: "apart", a: 0, b: 1 })).toBe(false)
    expect(markHolds(board, [0, 2, 8], { kind: "together", a: 0, b: 1 })).toBe(true)
  })

  it("measures a span from the first start to the last end", () => {
    expect(markHolds(board, [1, 4, 8], { kind: "span", ticks: 9 })).toBe(true)
    expect(markHolds(board, [1, 4, 8], { kind: "span", ticks: 10 })).toBe(false)
  })

  it("clamps a drag into the day instead of refusing it", () => {
    const state = createProcessionState(board)
    expect(slideBar(board, state, 2, 99).starts[2]).toBe(8)
    expect(slideBar(board, state, 2, -4).starts[2]).toBe(0)
    // A drag that lands where the bar already is changes nothing, so the screen has nothing to report.
    expect(slideBar(board, state, 2, 8)).toBe(state)
  })
})
