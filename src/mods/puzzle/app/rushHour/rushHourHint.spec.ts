import { describe, expect, it } from "vitest"
import {
  createRushHourState,
  rushHourSolved,
  slidePiece,
  type RushHourPuzzle,
} from "@/mods/puzzle/game/rushHour/rushHour"
import { generateRushHour } from "@/mods/puzzle/game/rushHour/generateRushHour"
import { RUSH_HOUR_CONFIG } from "@/mods/puzzle/game/rushHour/rushHourConfig"
import { optimalPath } from "@/mods/puzzle/game/rushHour/solveRushHour"
import { buildRushHourHint } from "./rushHourHint"

/**
 * The one thing a hint on this board has to be: **a move that actually gets the player nearer the way
 * out**. Everything else it says is a sentence about that move.
 */
describe("the blockade's hint", () => {
  const boards = (): RushHourPuzzle[] => {
    const options = RUSH_HOUR_CONFIG.expert
    const out: RushHourPuzzle[] = []
    for (let seed = 1; out.length < 3 && seed <= 40; seed++) {
      try {
        out.push(generateRushHour(seed, options, 1))
      } catch {
        continue
      }
    }
    return out
  }

  it("names a move that shortens the way out, from every position on the way", { timeout: 120_000 }, () => {
    for (const puzzle of boards()) {
      let state = createRushHourState(puzzle)
      let guard = 0
      while (!rushHourSolved(puzzle, state) && guard++ < 60) {
        const before = optimalPath(puzzle, state)?.length ?? 0
        const hint = buildRushHourHint(puzzle, state)
        expect(hint, "a board on the way out always has a next move").toBeDefined()
        if (!hint) break
        state = slidePiece(puzzle, state, hint.move.index, hint.move.offset)
        expect(optimalPath(puzzle, state)?.length).toBe(before - 1)
      }
      // Following the hints is a solution, which is the strongest statement about them there is.
      expect(rushHourSolved(puzzle, state)).toBe(true)
      expect(buildRushHourHint(puzzle, state)).toBeUndefined()
    }
  })

  /**
   * The three reasons, and which is which. A hint has to be honest about WHY the move it names is the
   * move: the piece in the player's own lane is in the way outright, and anything else is only in the way
   * of what is in the way.
   */
  it("says what kind of obstacle it is pointing at", () => {
    //  . . . A . .      A stands across the player's lane; it can only drop once the
    //  P P . A . .      piece below it is out of the way, and that one is not in the lane at all.
    //  . . . C C .
    const board: RushHourPuzzle = {
      size: 6,
      pieces: [
        { lane: 1, offset: 0, len: 2, horizontal: true },
        { lane: 3, offset: 0, len: 2, horizontal: false },
        { lane: 2, offset: 3, len: 2, horizontal: true },
      ],
    }
    const start = createRushHourState(board)
    expect(optimalPath(board, start)).toHaveLength(3)

    const first = buildRushHourHint(board, start)
    expect(first?.key).toBe("room")
    expect(first?.move.index).toBe(2)
    // Either way along its own row frees the cell above it, and the search takes whichever it meets
    // first — what the hint must be right about is WHICH piece and which axis.
    expect(["left", "right"]).toContain(first?.action)

    const shifted = slidePiece(board, start, 2, 0)
    const second = buildRushHourHint(board, shifted)
    expect(second?.key).toBe("clear")
    expect(second?.move.index).toBe(1)
    expect(second?.action).toBe("down")

    const cleared = slidePiece(board, shifted, 1, 2)
    expect(buildRushHourHint(board, cleared)?.key).toBe("drive")
  })
  /**
   * **The counter-intuitive move gets its own sentence.** Shoving your own piece AWAY from the way out is
   * the documented place people stall (family doc §7), and `drive`'s wording — "the way ahead is clear that
   * far" — is not vague about it but wrong.
   */
  it("says so when the move is backwards", () => {
    //  . . . W H H     the player has to back LEFT so W can drop through its row; only then can H slide
    //  . . . W . V     left, V rise into the corner, and the player drive out. Backing up is the only
    //  . . . P P V     legal move on the board.
    //  . . . . . U
    const board: RushHourPuzzle = {
      size: 6,
      pieces: [
        { lane: 2, offset: 3, len: 2, horizontal: true },
        { lane: 5, offset: 1, len: 2, horizontal: false },
        { lane: 5, offset: 3, len: 3, horizontal: false },
        { lane: 0, offset: 4, len: 2, horizontal: true },
        { lane: 3, offset: 0, len: 2, horizontal: false },
      ],
    }
    const start = createRushHourState(board)
    const first = buildRushHourHint(board, start)
    expect(first?.move.index).toBe(0)
    expect(first?.action).toBe("left")
    expect(first?.key).toBe("back")
  })
})
