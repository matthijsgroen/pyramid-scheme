import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { generateHidato } from "./generateHidato"
import { HIDATO_CONFIG } from "./hidatoConfig"
import { hexKey } from "./hex"
import { TECHNIQUES, nextHidatoStep, solveHidatoByTechniques, type HidatoPuzzleData } from "./techniques"

const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]

/** A straight line of cells: the smallest comb there is, and the one where every step is forced. */
const corridor = (length: number, givens: Record<string, number>): HidatoPuzzleData => ({
  cells: Array.from({ length }, (_, q) => ({ q, r: 0 })),
  givens,
})

describe("the hidato technique ladder", () => {
  it("has every technique it claims triggered by a board the generator ships", { timeout: 60_000 }, () => {
    const fired = new Set<string>()
    for (const tier of TIERS) {
      const options = HIDATO_CONFIG[tier]
      for (let seed = 1; seed <= 12; seed++)
        for (const step of solveHidatoByTechniques(generateHidato(seed, options), options.pruning).steps)
          fired.add(step.technique)
    }
    // `onlyCell` is the exception and is checked below on the board it fires on: it is the reason left
    // when no other one fits, and over 300 boards it came up three times. A sweep this size will not
    // meet it, and widening the sweep until it does would be minutes of solver time for one assertion.
    expect([...fired].sort()).toEqual([...TECHNIQUES].filter(technique => technique !== "onlyCell").sort())
  })

  it("reasons from nowhere else being left when nothing is written beside the cell", () => {
    // Expert seed 58 opens on it: the 5 has one cell in the whole comb, and neither the 4 nor the 6 is
    // written down next to it, so no reason about a neighbour is available to give instead.
    const options = HIDATO_CONFIG.expert
    const board = generateHidato(58, options)
    const step = nextHidatoStep(board, board.givens, options.pruning)!
    expect(step).toMatchObject({ technique: "onlyCell", value: 5 })
    expect(step.evidence).toEqual([])
  })

  it("names the two numbers a sandwich sits between, and the one cell it settles", () => {
    // 1 · 3 — the 2 has one cell, and both its neighbours are written down.
    const step = nextHidatoStep(corridor(3, { "0,0": 1, "2,0": 3 }), { "0,0": 1, "2,0": 3 }, "adjacency")
    expect(step).toMatchObject({ technique: "sandwich", value: 2, params: { before: 1, after: 3 } })
    expect(hexKey(step!.cell)).toBe("1,0")
    expect(step!.evidence.map(hexKey)).toEqual(["0,0", "2,0"])
  })

  it("reasons from the one number beside a cell when only one end is written", () => {
    // A run of four with only its ends known reaches the 2 from the 1, with nothing on its other side.
    const puzzle = corridor(4, { "0,0": 1, "3,0": 4 })
    const step = nextHidatoStep(puzzle, puzzle.givens, "adjacency")
    expect(step).toMatchObject({ technique: "neighbourForced", value: 2, params: { from: 1 } })
    expect(step!.evidence.map(hexKey)).toEqual(["0,0"])
  })

  it("stops on a board whose numbers cannot be joined up at all", () => {
    // 1 and 4 stand two cells apart in a corridor of four: three numbers apart, two steps of ground, so
    // no run joins them. The board is not merely unsolved, it is impossible — and the solver says so
    // rather than half-filling it.
    const puzzle = corridor(4, { "0,0": 1, "2,0": 4 })
    expect(solveHidatoByTechniques(puzzle, "adjacency").settled).toBe(false)
    expect(nextHidatoStep(puzzle, puzzle.givens, "adjacency")).toBeUndefined()
  })

  it("reads a corridor the gap rung can thread and the adjacency rung cannot", () => {
    // A wizard board is accepted only where the run has to be threaded (`requires: "gapPath"`), so the
    // rungs genuinely differ on it: the same board, read one rung down, stalls.
    const board = generateHidato(1, HIDATO_CONFIG.wizard)
    expect(solveHidatoByTechniques(board, "gapPath").settled).toBe(true)
    expect(solveHidatoByTechniques(board, "adjacency").settled).toBe(false)
  })

  it("reasons from the board the player left, not from the one that shipped", () => {
    const board = generateHidato(2, HIDATO_CONFIG.starter)
    const first = nextHidatoStep(board, board.givens, board.pruning)!
    const after = { ...board.givens, [hexKey(first.cell)]: first.value }
    // Following the advice moves the hint on: the same step is never offered twice.
    expect(hexKey(nextHidatoStep(board, after, board.pruning)!.cell)).not.toBe(hexKey(first.cell))
  })
})
