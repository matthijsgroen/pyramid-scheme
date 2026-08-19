import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { generateLightbeamFor } from "./plugin"
import { isLit } from "@/mods/puzzle/game/lightbeam/beam"
import { solveLightbeamByTechniques } from "@/mods/puzzle/game/lightbeam/techniques"

describe("the board real play gets", () => {
  it.each(difficulties)("builds a playable %s board through the plugin", { timeout: 120_000 }, tier => {
    for (let seed = 1; seed <= 5; seed++) {
      const board = generateLightbeamFor(tier, seed)
      expect(isLit(board, board.solution)).toBe(true)
      expect(isLit(board, board.initial)).toBe(false)
      expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
      expect(board.modes).toBeDefined()
    }
  })

  it("is deterministic in (difficulty, seed), which is all a board is derived from", () => {
    expect(generateLightbeamFor("wizard", 4)).toEqual(generateLightbeamFor("wizard", 4))
  })

  it("forces a single mode for the lab without the tier drawing its own", () => {
    const forced = generateLightbeamFor("wizard", 2, "wall-heavy")
    expect(forced.modes).toEqual(["wallHeavy"])
  })
})
