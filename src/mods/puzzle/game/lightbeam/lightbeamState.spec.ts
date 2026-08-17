import { describe, expect, it } from "vitest"
import { isLit } from "./beam"
import { generateLightbeam } from "./generateLightbeam"
import { createLightbeamState, cycleLightbeamPiece, pieceMoved } from "./lightbeamState"

const puzzle = generateLightbeam(5, 3, { turns: 2 })

describe("lightbeamState", () => {
  it("opens on the board's own starting settings", () => {
    expect(createLightbeamState(puzzle).states).toEqual(puzzle.initial)
  })

  it("a tap moves one piece on and leaves the rest alone", () => {
    const state = cycleLightbeamPiece(createLightbeamState(puzzle), puzzle, 0)
    expect(state.states[0]).not.toBe(puzzle.initial[0])
    expect(state.states.slice(1)).toEqual(puzzle.initial.slice(1))
  })

  // The reason this family has no undo: a piece has two settings, so tapping round again is the undo.
  it("tapping a piece round returns it to where it was", () => {
    let state = createLightbeamState(puzzle)
    for (let tap = 0; tap < 2; tap++) state = cycleLightbeamPiece(state, puzzle, 0)
    expect(state.states).toEqual(puzzle.initial)
  })

  it("does not touch the state it was handed", () => {
    const before = createLightbeamState(puzzle)
    cycleLightbeamPiece(before, puzzle, 0)
    expect(before.states).toEqual(puzzle.initial)
  })

  it("notices a piece the player has moved off its opening setting", () => {
    const state = cycleLightbeamPiece(createLightbeamState(puzzle), puzzle, 0)
    expect(pieceMoved(state, puzzle, 0)).toBe(true)
    expect(pieceMoved(createLightbeamState(puzzle), puzzle, 0)).toBe(false)
  })

  it("reaches the answer by tapping, which is all the player can do", () => {
    let state = createLightbeamState(puzzle)
    puzzle.movable.forEach((_, piece) => {
      while (state.states[piece] !== puzzle.solution[piece]) state = cycleLightbeamPiece(state, puzzle, piece)
    })
    expect(isLit(puzzle, state.states)).toBe(true)
  })
})
