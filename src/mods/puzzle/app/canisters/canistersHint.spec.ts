import { describe, expect, it } from "vitest"
import {
  applyMove,
  legalMoves,
  playLine,
  shortestLine,
  type CanistersPuzzle,
  type Volumes,
} from "@/mods/puzzle/game/canisters/canisters"
import { buildCanistersHint, type CanistersReading } from "./canistersHint"

/** Tartaglia's board: eight full, a five and a three to work in. */
const board: CanistersPuzzle = { capacities: [8, 5, 3], start: [8, 0, 0], targets: [4], budget: 6 }

/** A reading claims two numbers make a third — checked against a pour that is actually available. */
const holds = (reading: CanistersReading, volumes: Volumes): boolean =>
  legalMoves(board.capacities, volumes).some(move => {
    const after = applyMove(board.capacities, volumes, move)
    switch (reading.key) {
      case "leftover":
        return (
          volumes[move.from] === reading.params.content &&
          board.capacities[move.to] - volumes[move.to] === reading.params.space &&
          after[move.from] === reading.params.amount
        )
      case "full":
      case "sum":
        return (
          volumes[move.from] === reading.params.a &&
          volumes[move.to] === reading.params.b &&
          after[move.to] === reading.params.amount
        )
    }
  })

describe("what the hint says", () => {
  it("works back from the volume asked for, the way how-to-play says to", () => {
    // "Keep a 1 back" is advice nobody can act on until they know why a 1 is worth having. The goal
    // reading is that why: the two numbers the volume asked for is made of.
    const hint = buildCanistersHint(board, board.start, 6, 4)
    expect(hint.key).toBe("line")
    if (hint.key !== "line") return
    expect(hint.goal).toEqual({ key: "leftover", params: { amount: 4, content: 5, space: 1 } })
  })

  it("gives the sum before the goal, not the pour in front of the player", () => {
    // The chain is what a hint hands over. Whether its next sum can be poured this instant is the
    // player's to see — and easy, once they know which sum they are after.
    const hint = buildCanistersHint(board, board.start, 6, 4)
    if (hint.key !== "line") throw new Error("expected a line")
    expect(hint.next).toEqual({ key: "leftover", params: { amount: 2, content: 5, space: 3 } })
    // Which is NOT the opening pour: that one only stands the 5 up full, and makes nothing.
    const line = shortestLine(board.capacities, board.start, 4)!
    const opened = applyMove(board.capacities, board.start, line[0])
    expect(holds(hint.next!, board.start)).toBe(false)
    expect(holds(hint.next!, opened)).toBe(true)
  })

  it("never names a canister — only amounts, sizes and the room one still has", () => {
    // Matching the numbers to the vessels is the arithmetic this family is for, and a hint that pointed
    // would do that step for the player.
    let volumes: Volumes = board.start
    for (let step = 0; step < 6 && !volumes.includes(4); step++) {
      const hint = buildCanistersHint(board, volumes, 6, 4)
      if (hint.key !== "line") break
      for (const reading of [hint.goal, hint.next])
        if (reading) expect(Object.keys(reading.params)).not.toContain("from")
      const line = shortestLine(board.capacities, volumes, 4)!
      volumes = applyMove(board.capacities, volumes, line[0])
    }
    expect(volumes).toContain(4)
  })

  it("stops at the pour before the claim", () => {
    // One pour out, the goal reading IS the next pour, and there is nothing left to position for.
    const line = shortestLine(board.capacities, board.start, 4)!
    const oneLeft = playLine(board.capacities, board.start, line.slice(0, -1))
    const hint = buildCanistersHint(board, oneLeft, 6, 4)
    expect(hint.key).toBe("line")
    if (hint.key !== "line") return
    expect(hint.next).toBeUndefined()
    expect(hint.claim).toBe(true)
    expect(hint.goal.params.amount).toBe(4)
    expect(holds(hint.goal, oneLeft)).toBe(true)
  })

  it("says the board is lost rather than pointing at a pour", () => {
    // A position that cannot be finished in the moves left is the one thing a player cannot work out
    // without playing it twice.
    expect(buildCanistersHint(board, board.start, 1, 4).key).toBe("stuck")
    expect(buildCanistersHint(board, board.start, 0, 4).key).toBe("overBudget")
  })
})
