import { produce } from "immer"
import type { CrossingPath } from "./crossingRules"

export type CrossingState = {
  /** The stones stepped on so far — empty while the player is still on the near bank. */
  path: CrossingPath
  /** How many times the crocodile has taken a step. Health is spent by the room, this is the tally. */
  bites: number
  /** The stone that was just bitten, so the board can play the lunge before the water clears. */
  bittenAt?: { column: number; stone: number }
}

export const createCrossingState = (): CrossingState => ({ path: [], bites: 0 })

export const stepOnto = (stone: number) =>
  produce((state: CrossingState) => {
    state.path.push(stone)
    delete state.bittenAt
  })

/** A step the crocodile refused: it takes the player back to the near bank, and the room takes health. */
export const bitten = (column: number, stone: number) =>
  produce((state: CrossingState) => {
    state.bites += 1
    state.bittenAt = { column, stone }
    state.path = []
  })

export const clearBite = produce((state: CrossingState) => {
  delete state.bittenAt
})

export const resetCrossing = produce((state: CrossingState) => {
  state.path = []
  delete state.bittenAt
})
