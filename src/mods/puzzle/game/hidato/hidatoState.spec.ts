import { describe, expect, it } from "vitest"
import {
  armHidato,
  pickUpHidato,
  canUndoHidato,
  createHidatoState,
  eraseHidato,
  isHidatoSolved,
  stepHidato,
  undoHidato,
} from "./hidatoState"
import type { HidatoState } from "./hidatoState"
import type { HidatoPuzzleData } from "./techniques"

// A corridor of five, the run written in at both ends — the smallest board with something to fill.
const puzzle: HidatoPuzzleData = {
  cells: Array.from({ length: 5 }, (_, q) => ({ q, r: 0 })),
  givens: { "0,0": 1, "4,0": 5 },
}

// A longer one, so a stretch can be left hanging off nothing: with the 7 four cells away, a run laid
// from the 1 does not reach it.
const corridor: HidatoPuzzleData = {
  cells: Array.from({ length: 7 }, (_unused, q) => ({ q, r: 0 })),
  givens: { "0,0": 1, "6,0": 7 },
}

// A cell with room on every side of it, so the run has somewhere else to be carried.
const hive: HidatoPuzzleData = {
  cells: [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
  ],
  givens: { "0,-1": 1, "-1,1": 7 },
}

/** The board part-way through, as a state the actions can be handed. */
const laid = (values: Record<string, number>, pen: string): HidatoState => ({ values, pen, past: [] })

const carry = (keys: string[], board: HidatoPuzzleData = puzzle): HidatoState =>
  keys.reduce<HidatoState>(
    (state, key) => (state.values[key] === undefined ? stepHidato(state, key, board) : armHidato(state, key)),
    createHidatoState(board)
  )

describe("the hidato board the player leaves", () => {
  it("picks the run up at a number and puts it back down on a second tap", () => {
    const armed = armHidato(createHidatoState(puzzle), "0,0")
    expect(armed.pen).toBe("0,0")
    expect(armHidato(armed, "0,0").pen).toBeUndefined()
    // An empty cell is nothing to carry a run on from.
    expect(armHidato(createHidatoState(puzzle), "2,0").pen).toBeUndefined()
  })

  it("picks the run up on a press without ever putting it down again", () => {
    const armed = pickUpHidato(createHidatoState(puzzle), "0,0")
    expect(armed.pen).toBe("0,0")
    // The press that starts a drag lands on the cell the run is already on, and must leave it alone:
    // armHidato would toggle it off here, and the drag would then have nothing to carry (design doc §6.5).
    expect(pickUpHidato(armed, "0,0").pen).toBe("0,0")
    // An empty cell is still nothing to carry a run on from.
    expect(pickUpHidato(createHidatoState(puzzle), "2,0").pen).toBeUndefined()
  })

  it("counts up into touching cells, and refuses anything else", () => {
    const armed = armHidato(createHidatoState(puzzle), "0,0")
    expect(stepHidato(armed, "1,0", puzzle).values["1,0"]).toBe(2)
    // Two cells away is not a step, and a cell that already holds a number is not empty.
    expect(stepHidato(armed, "2,0", puzzle).values["2,0"]).toBeUndefined()
    expect(stepHidato(armed, "4,0", puzzle).values["4,0"]).toBe(5)
    // Nothing to count from at all.
    expect(stepHidato(createHidatoState(puzzle), "1,0", puzzle).values["1,0"]).toBeUndefined()
  })

  it("counts down instead when the next number is already on the board", () => {
    // Picked up at the 5, whose successor does not exist — so the run walks backwards into the 4.
    const back = stepHidato(armHidato(createHidatoState(puzzle), "4,0"), "3,0", puzzle)
    expect(back.values["3,0"]).toBe(4)
    expect(back.pen).toBe("3,0")
  })

  it("takes a number back off and leaves the run picked up where it came from", () => {
    const laid = carry(["0,0", "1,0", "2,0"])
    expect(laid.values).toMatchObject({ "1,0": 2, "2,0": 3 })
    const backedOut = eraseHidato(laid, "2,0", puzzle)
    expect(backedOut.values["2,0"]).toBeUndefined()
    expect(backedOut.pen).toBe("1,0")
    // A given is part of the puzzle: it cannot be taken off, whatever is tapped.
    expect(eraseHidato(laid, "0,0", puzzle).values["0,0"]).toBe(1)
  })

  it("carries the run a different way, rubbing out the way it went before", () => {
    // Picked up at the 2 with the 3 already laid to one side, and carried to the other side instead.
    const before = laid({ "0,-1": 1, "0,0": 2, "1,0": 3, "-1,1": 7 }, "0,0")
    const rerouted = stepHidato(before, "-1,0", hive)
    expect(rerouted.values).toEqual({ "0,-1": 1, "0,0": 2, "-1,0": 3, "-1,1": 7 })
    expect(rerouted.pen).toBe("-1,0")
  })

  it("takes everything that hung off the old way with it", () => {
    const before = laid({ "0,-1": 1, "0,0": 2, "1,0": 3, "1,-1": 4, "-1,1": 7 }, "0,0")
    // The 4 was only on the board because of the 3, and the 3 has just been laid somewhere else.
    expect(stepHidato(before, "-1,0", hive).values).toEqual({ "0,-1": 1, "0,0": 2, "-1,0": 3, "-1,1": 7 })
  })

  it("carries the run over its own old path, which is usually the only room there is", () => {
    // The run laid 1-2-3-4, and the 2 picked up again. Every cell beside the 2 is taken by the run
    // itself — which is the ordinary state of a board a dozen cells in, and why a re-route that needed
    // open ground could not be made where it is most wanted.
    const before = laid({ "0,-1": 1, "0,0": 2, "1,0": 3, "1,-1": 4, "-1,1": 7 }, "0,0")
    const rerouted = stepHidato(before, "1,-1", hive)
    // The old 3 and 4 are gone and the new 3 stands where the finger went.
    expect(rerouted.values).toEqual({ "0,-1": 1, "0,0": 2, "1,-1": 3, "-1,1": 7 })
    expect(rerouted.pen).toBe("1,-1")
  })

  it("leaves what the puzzle wrote in where it is, and keeps what still counts back to it", () => {
    const fixed: HidatoPuzzleData = { ...hive, givens: { ...hive.givens, "1,-1": 4 } }
    const before = laid({ "0,-1": 1, "0,0": 2, "1,0": 3, "1,-1": 4, "-1,1": 7 }, "0,0")
    // The 3 is re-drawn to the other side. The 4 is a number the puzzle wrote in and never moves.
    expect(stepHidato(before, "-1,0", fixed).values).toEqual({ "0,-1": 1, "0,0": 2, "-1,0": 3, "1,-1": 4, "-1,1": 7 })
  })

  /**
   * The run laid all the way round the ring and finishing in the middle, with a number the puzzle wrote
   * in standing in it. This is the board the old rule could not draw on: it worked out the stretch a
   * redraw would sweep, stopped that stretch at the given, and then refused every cell beyond it — which
   * on a board a dozen cells deep is all the cells worth dragging to.
   */
  const ring: HidatoPuzzleData = { ...hive, givens: { "0,-1": 1, "-1,1": 5 } }
  const round = {
    "0,-1": 1,
    "1,-1": 2,
    "1,0": 3,
    "0,1": 4,
    "-1,1": 5,
    "-1,0": 6,
    "0,0": 7,
  }

  it("draws over the tail past a number the puzzle wrote in", () => {
    // Picked up at the 2 and carried onto the far end of its own run, with the given 5 standing between
    // the two. The 3 lands where the finger went; the 7 it drew over is gone.
    const after = stepHidato(laid(round, "1,-1"), "0,0", ring)
    expect(after.values).toEqual({ "0,-1": 1, "1,-1": 2, "0,0": 3, "0,1": 4, "-1,1": 5, "-1,0": 6 })
    expect(after.pen).toBe("0,0")
  })

  it("keeps the numbers still counting back to that given, and drops the ones that are not", () => {
    // The 4 and the 6 are counted from the 5, which has not moved, so they stay. Nothing else does.
    const after = stepHidato(laid(round, "1,-1"), "0,0", ring)
    expect(after.values["0,1"]).toBe(4)
    expect(after.values["-1,0"]).toBe(6)
  })

  it("will not draw over a number behind the one being carried", () => {
    // Carrying the 6, dragged onto the 3: that is the line the finger came along, and cutting it was
    // never the intention.
    expect(stepHidato(laid(round, "-1,0"), "1,0", ring)).toEqual(laid(round, "-1,0"))
  })

  it("never lays a number past one the puzzle wrote in", () => {
    const fixed: HidatoPuzzleData = { ...hive, givens: { ...hive.givens, "1,0": 3 } }
    const before = laid({ "0,-1": 1, "0,0": 2, "1,0": 3, "-1,1": 7 }, "0,0")
    const after = stepHidato(before, "-1,0", fixed)
    // The 3 is where the puzzle put it and no new number was written: a given is not the player's to
    // move, so there is nothing to re-route here. What the drag CAN do is take the 2 with it (reading 4),
    // which changes where the numbers stand and not which ones are down.
    expect(after.values["1,0"]).toBe(3)
    expect(Object.values(after.values).sort((left, right) => left - right)).toEqual([1, 2, 3, 7])
  })

  it("puts a re-route and everything it swept up back on one undo", () => {
    const before = laid({ "0,-1": 1, "0,0": 2, "1,0": 3, "1,-1": 4, "-1,1": 7 }, "0,0")
    expect(undoHidato(stepHidato(before, "-1,0", hive)).values).toEqual(before.values)
  })

  it("moves the number the run has stopped on, when there is nothing left to lay", () => {
    // The run has reached the 3 and the 4 is a number the puzzle wrote in, standing somewhere the 3 does
    // not touch: nothing to lay, nothing to re-route, and the 3 is simply in the wrong place. Dragging off
    // it means "this one goes here instead".
    const fixed: HidatoPuzzleData = { ...hive, givens: { "0,-1": 1, "-1,0": 4 } }
    const before = laid({ "0,-1": 1, "1,-1": 2, "1,0": 3, "-1,0": 4 }, "1,0")
    const moved = stepHidato(before, "0,0", fixed)
    expect(moved.values).toEqual({ "0,-1": 1, "1,-1": 2, "0,0": 3, "-1,0": 4 })
    expect(moved.pen).toBe("0,0")
  })

  it("will not move it somewhere the number before it cannot reach", () => {
    const fixed: HidatoPuzzleData = { ...hive, givens: { "0,-1": 1, "-1,0": 4 } }
    const before = laid({ "0,-1": 1, "1,-1": 2, "1,0": 3, "-1,0": 4 }, "1,0")
    // (0,1) touches the 3 but not the 2, so putting the 3 there would break the line behind it.
    expect(stepHidato(before, "0,1", fixed)).toEqual(before)
  })

  it("never moves a number the puzzle wrote in", () => {
    const fixed: HidatoPuzzleData = { ...hive, givens: { "0,-1": 1, "1,0": 3, "-1,0": 4 } }
    const before = laid({ "0,-1": 1, "1,-1": 2, "1,0": 3, "-1,0": 4 }, "1,0")
    expect(stepHidato(before, "0,0", fixed)).toEqual(before)
  })

  it("takes the rest of the chain off with a number that was holding it up", () => {
    // 1 given, then 2, 3, 4 laid by hand, and the 7 still four cells away.
    const laid = carry(["0,0", "1,0", "2,0", "3,0"], corridor)
    expect(laid.values).toMatchObject({ "1,0": 2, "2,0": 3, "3,0": 4 })

    // Taking the 3 off leaves the 4 counted back to nothing, so it goes with it. The 2 still counts
    // back to the given 1, so it stays.
    const cut = eraseHidato(laid, "2,0", corridor)
    expect(cut.values).toEqual({ "0,0": 1, "6,0": 7, "1,0": 2 })
    // And the run is picked up behind the hole, ready to be laid again.
    expect(cut.pen).toBe("1,0")
  })

  it("keeps both halves of a stretch that is written in at both ends", () => {
    const laid = carry(["0,0", "1,0", "2,0", "3,0"])
    const cut = eraseHidato(laid, "2,0", puzzle)
    // The 2 counts back to the 1 and the 4 counts on to the 5, so only the number tapped comes off.
    expect(cut.values).toEqual({ "0,0": 1, "4,0": 5, "1,0": 2, "3,0": 4 })
  })

  it("puts a whole cascade back in one undo", () => {
    const laid = carry(["0,0", "1,0", "2,0", "3,0"], corridor)
    expect(undoHidato(eraseHidato(laid, "2,0", corridor)).values).toEqual(laid.values)
  })

  it("undoes one move at a time, and only moves that changed the board", () => {
    const laid = carry(["0,0", "1,0"])
    expect(canUndoHidato(laid)).toBe(true)
    expect(undoHidato(laid).values["1,0"]).toBeUndefined()
    // Picking the run up and putting it down changes nothing there is to undo.
    expect(canUndoHidato(armHidato(createHidatoState(puzzle), "0,0"))).toBe(false)
  })

  it("calls the comb solved only once the run reaches the last number", () => {
    expect(isHidatoSolved(puzzle, { "0,0": 1, "1,0": 2, "2,0": 3, "3,0": 4, "4,0": 5 })).toBe(true)
    // Full, and every number used once — but the run breaks in the middle, so it never gets to the 5.
    // A filled comb is not a finished one: what finishes it is the line arriving at the last number,
    // which is the same thing the board draws (HidatoBoard's runPath).
    expect(isHidatoSolved(puzzle, { "0,0": 1, "1,0": 2, "2,0": 4, "3,0": 3, "4,0": 5 })).toBe(false)
    expect(isHidatoSolved(puzzle, { "0,0": 1, "4,0": 5 })).toBe(false)
    // Every number but the last one in place and joined up: still not finished, because the run has to
    // be carried into the 5 rather than stopping beside it.
    expect(isHidatoSolved(puzzle, { "0,0": 1, "1,0": 2, "2,0": 3, "3,0": 4 })).toBe(false)
  })
})
