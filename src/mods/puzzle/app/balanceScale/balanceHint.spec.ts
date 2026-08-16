import { describe, expect, it } from "vitest"
import { BALANCE_CONFIG } from "@/mods/puzzle/game/balanceScale/balanceConfig"
import { generateBalance } from "@/mods/puzzle/game/balanceScale/generateBalance"
import type { BalancePuzzleData, Scale } from "@/mods/puzzle/game/balanceScale/techniques"
import { buildBalanceHint } from "./balanceHint"

const glyph = (name: string) => ({ kind: "glyph" as const, glyph: name })
const stone = (value: number) => ({ kind: "weight" as const, value })

const scales: Scale[] = [
  { left: [glyph("a"), glyph("b")], right: [stone(10)] },
  { left: [glyph("a"), glyph("b"), glyph("b")], right: [stone(14)] },
]
const puzzle: BalancePuzzleData = { glyphs: ["a", "b"], scales, maxValue: 12 }
const solution = { a: 6, b: 4 }

describe("buildBalanceHint", () => {
  it("names a wrong weight before anything else, even where a technique would fire", () => {
    const hint = buildBalanceHint(puzzle, { b: 3 }, [], solution, "difference")
    expect(hint).toMatchObject({ key: "mistake", glyph: "b" })
    expect(hint!.refs).toEqual([])
  })

  it("names the move and the scales it is made on", () => {
    const hint = buildBalanceHint(puzzle, {}, [], solution, "difference")
    expect(hint).toMatchObject({ key: "difference", glyph: "b", params: { glyph: "b" } })
    expect(hint!.refs).toEqual([
      { kind: "scale", index: 0 },
      { kind: "scale", index: 1 },
    ])
  })

  // The point of the rewrite: the solver knows b is 4 at this step and says none of it. Doing the
  // arithmetic is the part worth keeping for the player (design doc §6).
  it("never carries the weight it knows", () => {
    const hint = buildBalanceHint(puzzle, {}, [], solution, "difference")
    expect(Object.keys(hint!.params)).toEqual(["glyph"])
    expect(JSON.stringify(hint!.params)).not.toContain("4")
  })

  it("stays inside the board's own cap, so a gentle board explains itself gently", () => {
    expect(buildBalanceHint(puzzle, {}, [], solution, "equalShares")).toBeUndefined()
  })

  it("says nothing once the board is answered", () => {
    expect(buildBalanceHint(puzzle, solution, [], solution, "difference")).toBeUndefined()
  })

  // Rule 3 of the screen bar: every hint carries a reason, and the reason comes from the solver — so
  // a real board must produce one at every step of being solved.
  it("has something to say at every step of a real board", () => {
    const board = generateBalance(4, BALANCE_CONFIG.master)
    const values: Record<string, number | undefined> = {}
    for (const glyph of board.glyphs) {
      const hint = buildBalanceHint(board, values, [], board.solution, board.techniqueCap)
      expect(hint, `a hint while ${JSON.stringify(values)} is on the board`).toBeDefined()
      values[hint?.glyph ?? glyph] = board.solution[hint?.glyph ?? glyph]
    }
    expect(values).toEqual(board.solution)
  })
})
