import { describe, expect, it } from "vitest"
import { applyMove, playLine, shortestLine, type CanistersPuzzle } from "@/mods/puzzle/game/canisters/canisters"
import { buildCanistersHint } from "./canistersHint"

/** Tartaglia's board: eight full, a five and a three to work in. */
const board: CanistersPuzzle = { capacities: [8, 5, 3], start: [8, 0, 0], targets: [4], budget: 6 }

describe("what the hint says", () => {
  it("names a pour by the canisters' own sizes, never by their position", () => {
    // "One of the pours" is advice nobody can act on.
    const hint = buildCanistersHint(board, board.start, 6, 4)
    expect(hint.move).toBeDefined()
    expect([8, 5, 3]).toContain(hint.params?.from)
    expect([8, 5, 3]).toContain(hint.params?.to)
  })

  it("gives a reason the player can check against the canisters", () => {
    // Both reasons are things a pour visibly does: it fills the destination, or it empties the source.
    const hint = buildCanistersHint(board, board.start, 6, 4)
    expect(["fills", "empties", "last"]).toContain(hint.key)
    if (hint.key === "fills") {
      const after = applyMove(board.capacities, board.start, hint.move!)
      expect(after[hint.move!.to]).toBe(board.capacities[hint.move!.to])
    }
  })

  it("points along a line that actually reaches the volume", () => {
    // The reason may be local, but the move must not lead away from the answer.
    let volumes = board.start
    let left = board.budget
    for (let step = 0; step < board.budget; step++) {
      const hint = buildCanistersHint(board, volumes, left, 4)
      if (hint.move === undefined) break
      volumes = applyMove(board.capacities, volumes, hint.move)
      left--
      if (volumes.includes(4)) break
    }
    expect(volumes).toContain(4)
  })

  it("says the volume will be standing, but never which canister holds it", () => {
    // Finding that is the claim, and the claim is the puzzle's last question.
    const line = shortestLine(board.capacities, board.start, 4)!
    const oneLeft = playLine(board.capacities, board.start, line.slice(0, -1))
    const hint = buildCanistersHint(board, oneLeft, 6, 4)
    expect(hint.key).toBe("last")
    expect(hint.params?.target).toBe(4)
  })

  it("says the board is lost rather than pointing at a pour", () => {
    // A position that cannot be finished in the moves left is the one thing a player cannot work out
    // without playing it twice.
    expect(buildCanistersHint(board, board.start, 1, 4).key).toBe("stuck")
    expect(buildCanistersHint(board, board.start, 0, 4).key).toBe("overBudget")
  })

  it("never puts an amount in the sentence", () => {
    // No board says how much is in a canister, and a hint that did would hand over the tracking that IS
    // the puzzle. Only capacities and the volume asked for may appear.
    const sizes = [...board.capacities, 4]
    let volumes = board.start
    for (let step = 0; step < 5; step++) {
      const hint = buildCanistersHint(board, volumes, 6, 4)
      for (const value of Object.values(hint.params ?? {})) expect(sizes).toContain(value)
      if (hint.move === undefined) break
      volumes = applyMove(board.capacities, volumes, hint.move)
    }
  })
})
