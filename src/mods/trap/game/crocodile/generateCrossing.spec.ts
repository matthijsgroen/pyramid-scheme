import { describe, expect, it } from "vitest"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { CROCODILE_CONFIG } from "./crocodileConfig"
import { generateCrossing, MAX_WINNING_MARGIN } from "./generateCrossing"
import { wantedStep, winningMargins, type CrossingPuzzle, type Sign } from "./crossingRules"

/** The tiers a crocodile is actually built at — starter tombs author no capstone. */
const TIERS = difficulties.filter((tier): tier is Difficulty => tier !== "starter")

const board = (values: number[][], signs: Sign[]): CrossingPuzzle => ({
  columns: values.map(column =>
    column.map(value => ({ value, formula: { left: value, right: 0, operation: "+" as const, result: value } }))
  ),
  signs,
})

describe("what a crocodile wants", () => {
  it("takes the biggest answer of the row it guards", () => {
    const puzzle = board(
      [
        [4, 9],
        [6, 2],
      ],
      ["biggest", "biggest"]
    )
    expect(wantedStep(puzzle, [])).toBe(1) // 9
    expect(wantedStep(puzzle, [1])).toBe(0) // 6
  })

  it("takes the smallest where that is what it asks for, whatever the player is standing on", () => {
    const puzzle = board(
      [
        [4, 9],
        [6, 2],
      ],
      ["smallest", "smallest"]
    )
    expect(wantedStep(puzzle, [])).toBe(0) // 4
    expect(wantedStep(puzzle, [0])).toBe(1) // 2 — the stone underfoot never enters into it
  })

  it("has nothing left to want once the far bank is reached", () => {
    const puzzle = board([[4, 9]], ["biggest"])
    expect(wantedStep(puzzle, [1])).toBeUndefined()
  })

  it("measures how far the answer stands clear of its nearest rival", () => {
    expect(winningMargins(board([[4, 9, 8]], ["biggest"]))).toEqual([1]) // 9 over 8
    expect(winningMargins(board([[4, 9, 8]], ["smallest"]))).toEqual([4]) // 4 under 8
  })
})

describe("generating a crossing", () => {
  it.each(TIERS)("%s builds a board its own tier asked for", tier => {
    const options = CROCODILE_CONFIG[tier]
    const puzzle = generateCrossing(1234, options)
    expect(puzzle.columns).toHaveLength(options.columns)
    expect(puzzle.signs).toHaveLength(options.columns)
    for (const column of puzzle.columns) {
      expect(column).toHaveLength(options.stonesPerColumn)
      // Two stones worth the same in one column are one choice offered twice — and a tie for the answer.
      expect(new Set(column.map(stone => stone.value)).size).toBe(column.length)
    }
  })

  it.each(TIERS)("%s keeps the answer close enough that it has to be worked out", tier => {
    const options = CROCODILE_CONFIG[tier]
    for (const seed of [1, 2, 3, 7, 42, 99])
      for (const margin of winningMargins(generateCrossing(seed, options)))
        expect(margin, `seed ${seed}`).toBeLessThanOrEqual(MAX_WINNING_MARGIN)
  })

  it("asks for the biggest all the way across at junior, and mixes above it", () => {
    expect(new Set(generateCrossing(1, CROCODILE_CONFIG.junior).signs)).toEqual(new Set(["biggest"]))
    for (const tier of ["expert", "master", "wizard"] as const)
      for (const seed of [1, 8, 21])
        expect(new Set(generateCrossing(seed, CROCODILE_CONFIG[tier]).signs).size, `${tier} ${seed}`).toBe(2)
  })

  it("builds the same board from the same seed", () => {
    const first = generateCrossing(77, CROCODILE_CONFIG.master)
    expect(generateCrossing(77, CROCODILE_CONFIG.master)).toEqual(first)
  })
})
