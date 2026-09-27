import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { hexDistance, hexFromKey, hexKey, hexRing, hexagon } from "./hex"
import { generateHidato, gradeHidato } from "./generateHidato"
import { HIDATO_CONFIG } from "./hidatoConfig"
import { PRUNINGS, solveHidatoByTechniques } from "./techniques"

const SEEDS = [1, 2, 3, 4, 5, 6]

const TIERS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]

describe("generateHidato", () => {
  it.each(TIERS)("draws a %s board that deduction alone finishes", { timeout: 60_000 }, tier => {
    const options = HIDATO_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateHidato(seed, options)
      const result = solveHidatoByTechniques(board, options.pruning)
      // No board may need a guess. Every step being forced is also what settles uniqueness, which is
      // why nothing in this family counts solutions.
      expect(result.settled, `${tier} seed ${seed}`).toBe(true)
      expect(result.values).toEqual(board.solution)
    }
  })

  it.each(TIERS)("carves the %s comb as one unbroken run", tier => {
    const options = HIDATO_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateHidato(seed, options)
      expect(board.cells.length).toBe(options.cells)
      // Every number from 1 to the last, once each, and each one touching the number before it — the
      // board IS the run, so a gap in it would be a board with no answer.
      expect(Object.values(board.solution).sort((a, b) => a - b)).toEqual(
        Array.from({ length: options.cells }, (_, index) => index + 1)
      )
      const cellFor = new Map(Object.entries(board.solution).map(([key, value]) => [value, hexFromKey(key)]))
      for (let value = 1; value < options.cells; value++)
        expect(hexDistance(cellFor.get(value)!, cellFor.get(value + 1)!), `${tier} seed ${seed} at ${value}`).toBe(1)
    }
  })

  it.each(TIERS)("shapes the %s comb as a filled hive, never a ring", tier => {
    const options = HIDATO_CONFIG[tier]
    for (const seed of SEEDS) {
      const shape = new Set(generateHidato(seed, options).cells.map(hexKey))
      // The hexagon one size down is whole — this is the guard against the walk going round the
      // outside and leaving a hole through the middle (design doc §3.1).
      for (const cell of hexagon(options.radius - 1)) expect(shape.has(hexKey(cell)), `${tier} ${seed}`).toBe(true)
      // What is left sits on the next ring out, in one contiguous arc of it.
      const ring = hexRing(options.radius).map(hexKey)
      const on = ring.map(key => shape.has(key))
      const breaks = on.filter((here, at) => here && !on[(at + on.length - 1) % on.length]).length
      expect(shape.size).toBe(options.cells)
      expect(breaks, `${tier} seed ${seed} arc pieces`).toBeLessThanOrEqual(1)
    }
  })

  it.each(TIERS)("keeps the %s run off the rim for longer than its tier allows", tier => {
    const options = HIDATO_CONFIG[tier]
    if (options.rimStreak === undefined) return
    for (const seed of SEEDS) {
      const board = generateHidato(seed, options)
      const path = Object.entries(board.solution)
        .sort((left, right) => left[1] - right[1])
        .map(([key]) => hexFromKey(key))
      // The longest unbroken stretch of run sitting on the comb's outer ring. Left to Warnsdorff alone
      // this reached 11 of 19 cells — a run that laps the rim is one a player can guess before reading a
      // number, which is what the dial exists to stop (design doc §3.3).
      let longest = 0
      let streak = 0
      for (const cell of path) {
        streak = hexDistance({ q: 0, r: 0 }, cell) === options.radius ? streak + 1 : 0
        longest = Math.max(longest, streak)
      }
      expect(longest, `${tier} seed ${seed}`).toBeLessThanOrEqual(options.rimStreak)
    }
  })

  it.each(TIERS)("hands the %s player both ends of the run and at least the tier's numbers", tier => {
    const options = HIDATO_CONFIG[tier]
    for (const seed of SEEDS) {
      const board = generateHidato(seed, options)
      // The first and the last always ship written in: a board that hides where the run starts is
      // asking for a guess, and every other reason eventually leans on those two.
      expect(Object.values(board.givens)).toContain(1)
      expect(Object.values(board.givens)).toContain(options.cells)
      expect(Object.keys(board.givens).length).toBeGreaterThanOrEqual(options.givens)
      for (const [key, value] of Object.entries(board.givens)) expect(board.solution[key]).toBe(value)
    }
  })

  it("draws the same board from the same seed, and different boards from different seeds", () => {
    const options = HIDATO_CONFIG.expert
    expect(generateHidato(4, options)).toEqual(generateHidato(4, options))
    const boards = SEEDS.map(seed => JSON.stringify(generateHidato(seed, options).givens))
    expect(new Set(boards).size).toBe(SEEDS.length)
  })

  it("ships the cells in reading order, so their order says nothing about the answer", () => {
    const board = generateHidato(7, HIDATO_CONFIG.junior)
    const inOrder = [...board.cells].sort((a, b) => a.r - b.r || a.q - b.q)
    expect(board.cells.map(hexKey)).toEqual(inOrder.map(hexKey))
  })

  describe("gradeHidato", () => {
    it("refuses a board that needs more reading than the tier allows", () => {
      const options = HIDATO_CONFIG.wizard
      const board = generateHidato(2, options)
      expect(gradeHidato(board, options)).not.toBeNull()
      // The same board, judged as if it were a tier that may only ask for adjacency: the rung it turns
      // on is exactly what puts it out of reach.
      expect(gradeHidato(board, { ...options, pruning: "adjacency", requires: undefined })).toBeNull()
    })

    it("refuses a board that never turns the required rung on", () => {
      const options = HIDATO_CONFIG.starter
      const board = generateHidato(3, options)
      expect(gradeHidato(board, options)?.deepest).toBe("adjacency")
      expect(gradeHidato(board, { ...options, pruning: "gapPath", requires: "gapPath" })).toBeNull()
    })

    it("reports the weakest rung that settles the board, so a tier can be measured", () => {
      for (const tier of TIERS) {
        const options = HIDATO_CONFIG[tier]
        const grade = gradeHidato(generateHidato(5, options), options)
        expect(grade, tier).not.toBeNull()
        expect(PRUNINGS).toContain(grade!.deepest)
        expect(grade!.steps).toBe(options.cells - Object.keys(generateHidato(5, options).givens).length)
      }
    })
  })
})
