import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { CONSTELLATION_CONFIG } from "@/mods/puzzle/game/constellation/constellationConfig"
import { generateConstellation } from "@/mods/puzzle/game/constellation/generateConstellation"
import { buildConstellationHint } from "./constellationHint"

/**
 * Every rung ends in a move, and the move is read off the bounds the rung decides.
 *
 * `puzzle-screens.md` §4.1 asks for a reason and then an imperative; here the imperative is derived rather
 * than written per technique, so what needs guarding is the derivation — a rung whose bounds fall through
 * every case would leave a reason with nothing after it, and nobody would notice until they read a board.
 */
describe("constellation hints", () => {
  it("asks for a move on every rung a real sky offers", { timeout: 120_000 }, () => {
    const seen = new Set<string>()
    for (const difficulty of difficulties) {
      const board = generateConstellation(4, CONSTELLATION_CONFIG[difficulty])
      const lines = [...board.solution].map(() => 0)
      for (let guard = 0; guard < 400; guard++) {
        const hint = buildConstellationHint(board, { lines })
        if (!hint) break
        expect(hint.action, `${difficulty}: ${hint.key} asks for nothing`).toBeDefined()
        seen.add(hint.action!.key)
        // Follow the hint's own focus to the answer, so the walk visits the states a player would.
        if (hint.focus !== undefined) lines[hint.focus] = board.solution[hint.focus]
        else break
      }
    }
    // A derivation that only ever produced one kind of move would pass the check above and still be wrong.
    expect(seen.size).toBeGreaterThan(1)
  })

  it("asks for nothing when the board holds a wrong line", () => {
    const board = generateConstellation(4, CONSTELLATION_CONFIG.expert)
    const wrong = board.solution.findIndex(count => count === 0)
    const lines = [...board.solution]
    lines[wrong] = 1
    const hint = buildConstellationHint(board, { lines })
    // The way out of a wrong line is the player's to find; naming it would be naming the answer.
    expect(hint?.key).toBe("mistake")
    expect(hint?.action).toBeUndefined()
  })
})
