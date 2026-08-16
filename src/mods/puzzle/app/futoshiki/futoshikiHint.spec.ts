import { describe, expect, it } from "vitest"
import { buildFutoshikiHint } from "./futoshikiHint"
import { generateFutoshiki } from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import { FUTOSHIKI_CONFIG } from "@/mods/puzzle/game/futoshiki/futoshikiConfig"
import type { FutoshikiPuzzleData, FutoshikiValues } from "@/mods/puzzle/game/futoshiki/techniques"

const blankGrid = (size: number): FutoshikiValues =>
  Array.from({ length: size }, () => new Array<number | undefined>(size).fill(undefined))

const noNotes = (size: number) => Array.from({ length: size }, () => Array.from({ length: size }, () => [] as number[]))

const puzzle: FutoshikiPuzzleData = {
  size: 3,
  givens: blankGrid(3),
  constraints: [{ row: 0, col: 0, direction: "right", relation: "<" }],
}

const solution = [
  [1, 2, 3],
  [2, 3, 1],
  [3, 1, 2],
]

describe("buildFutoshikiHint", () => {
  it("names a wrong number before anything else, however much else is deducible", () => {
    const values = blankGrid(3)
    values[0][0] = 3
    const hint = buildFutoshikiHint(puzzle, values, noNotes(3), solution, "nakedPair")
    expect(hint).toMatchObject({ key: "mistake.value" })
    expect([...hint!.cells]).toEqual(["0,0"])
  })

  it("names notes that have ruled the right number out", () => {
    const notes = noNotes(3)
    notes[1][1] = [1, 2]
    expect(buildFutoshikiHint(puzzle, blankGrid(3), notes, solution, "nakedPair")?.key).toBe("mistake.note")
  })

  it("carries the technique's own numbers into the sentence's slots", () => {
    const hint = buildFutoshikiHint(puzzle, blankGrid(3), noNotes(3), solution, "nakedPair")
    expect(hint).toMatchObject({ key: "signBound.high", params: { value: 3 } })
  })

  it("points at the sign its reason is about, so the board can light it up", () => {
    const hint = buildFutoshikiHint(puzzle, blankGrid(3), noNotes(3), solution, "nakedPair")
    expect([...hint!.constraints]).toEqual([0])
  })

  it("stays inside the board's own ladder, so a gentle board explains itself gently", () => {
    const board = generateFutoshiki(FUTOSHIKI_CONFIG.starter.size, 3, FUTOSHIKI_CONFIG.starter)
    const hint = buildFutoshikiHint(board, board.givens, noNotes(board.size), board.solution, board.techniqueCap)
    expect(["signBound", "signVsValue", "nakedSingle", "hiddenSingle"]).toContain(hint!.key.split(".")[0])
  })

  it("says nothing once the board is finished", () => {
    expect(buildFutoshikiHint(puzzle, solution, noNotes(3), solution, "nakedPair")).toBeUndefined()
  })
})
