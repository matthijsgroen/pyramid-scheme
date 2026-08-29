import { describe, expect, it } from "vitest"
import { PROCESSION_CONFIG } from "@/mods/puzzle/game/procession/processionConfig"
import { generateProcession } from "@/mods/puzzle/game/procession/generateProcession"
import { requiredRung } from "@/mods/puzzle/game/procession/solveProcession"
import { createProcessionState } from "@/mods/puzzle/game/procession/procession"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { configHash } from "@/game/seeds/configHash"
import { buildProcessionHint } from "./processionHint"

const board = (tier: "starter" | "expert" | "wizard") => {
  const options = PROCESSION_CONFIG[tier]
  return generateProcession(puzzleSeeds[configHash(options)][0], options, 1)
}

describe("the hint", () => {
  it.each(["starter", "expert", "wizard"] as const)("names a %s bar the ladder can place itself", tier => {
    const puzzle = board(tier)
    const hint = buildProcessionHint(puzzle, createProcessionState(puzzle))!
    expect(hint).toBeDefined()
    // What it says is where the bar belongs, so it has to agree with the board's one answer.
    expect(requiredRung(puzzle)!.starts[hint.bar]).toBe(hint.tick)
    // And it has to be about a bar the player has NOT already put there, or it teaches nothing.
    expect(puzzle.bars[hint.bar].start).not.toBe(hint.tick)
  })

  it("has nothing to say once every bar is where it belongs", () => {
    const puzzle = board("starter")
    const answer = { starts: requiredRung(puzzle)!.starts }
    expect(buildProcessionHint(puzzle, answer)).toBeUndefined()
  })
})
