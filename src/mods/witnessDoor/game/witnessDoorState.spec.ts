import { describe, expect, it } from "vitest"
import { generateWitnessDoor, solutionsFor } from "./generateWitnessDoor"
import {
  chooseWitnessShrine,
  createWitnessDoorState,
  isWitnessDoorSolved,
  litWitnessShrine,
  turnWitnessMirror,
  type WitnessDoorState,
} from "./witnessDoorState"
import { cellKey } from "@/mods/core/game/beam/physics"

const board = generateWitnessDoor(1, "junior")

/** The board as the winning route for `shrine` leaves it, reached the way the player reaches it: by turning. */
const routeTo = (state: WitnessDoorState, shrine: "east" | "north"): WitnessDoorState => {
  const wanted = new Map(solutionsFor(board, shrine)[0].map(mirror => [cellKey(mirror.at), mirror.angle]))
  return board.grid.mirrors.reduce(
    (next, at, index) => (wanted.get(cellKey(at)) === state.angles[index] ? next : turnWitnessMirror(next, index)),
    state
  )
}

describe("a witness door's state", () => {
  it("opens dark, with the light reaching neither shrine", () => {
    expect(litWitnessShrine(board, createWitnessDoorState(board))).toBeUndefined()
  })

  it("is a route and not an answer until a shrine is named", () => {
    const routed = routeTo(createWitnessDoorState(board), "east")
    expect(litWitnessShrine(board, routed)).toBe("east")
    expect(isWitnessDoorSolved(board, routed, routed.chosen)).toBe(false)
  })

  it("is solved when the light reaches the shrine the player named", () => {
    const state = routeTo(chooseWitnessShrine(createWitnessDoorState(board), "east"), "east")
    expect(isWitnessDoorSolved(board, state, state.chosen)).toBe(true)
  })

  it("is not solved by routing to the other shrine", () => {
    const state = routeTo(chooseWitnessShrine(createWitnessDoorState(board), "east"), "north")
    expect(litWitnessShrine(board, state)).toBe("north")
    expect(isWitnessDoorSolved(board, state, state.chosen)).toBe(false)
  })

  it("puts a mirror back where it was on a second tap", () => {
    const opened = createWitnessDoorState(board)
    expect(turnWitnessMirror(turnWitnessMirror(opened, 0), 0).angles).toEqual(opened.angles)
  })
})
