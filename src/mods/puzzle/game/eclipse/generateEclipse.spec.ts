import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { eclipseSolved, lines, type Mark } from "./eclipse"
import { ECLIPSE_CONFIG } from "./eclipseConfig"
import { eclipseGivenCount, generateEclipse, techniquesUpTo } from "./generateEclipse"
import { solveEclipseByTechniques } from "./techniques"

const boards = (difficulty: (typeof difficulties)[number], count = 6) =>
  Array.from({ length: count }, (_unused, seed) => generateEclipse(seed + 1, ECLIPSE_CONFIG[difficulty]))

describe("eclipse generation", () => {
  // A top-tier board is most of a second to draw, and these ask for six of them.
  it.each(difficulties)("draws %s boards whose answer obeys both grid rules", { timeout: 60_000 }, difficulty => {
    for (const board of boards(difficulty)) {
      expect(eclipseSolved(board, { marks: board.solution })).toBe(true)
      for (const line of lines(board.size)) {
        const suns = line.filter(cell => board.solution[cell] === "sun").length
        expect(suns).toBe(board.size / 2)
      }
    }
  })

  it.each(difficulties)(
    "draws %s boards the tier's own reasoning settles, and no more",
    { timeout: 60_000 },
    difficulty => {
      const allowed = techniquesUpTo(ECLIPSE_CONFIG[difficulty].techniqueCap)
      for (const board of boards(difficulty)) {
        const result = solveEclipseByTechniques(board, allowed)
        expect(result.settled).toBe(true)
        expect(result.marks).toEqual([...board.solution])
        // Deduction settles it, so it has exactly one solution — nothing was ever guessed.
        expect(result.steps.length).toBeGreaterThan(0)
      }
    }
  )

  it.each(difficulties)("makes a %s board demand the rung its tier introduces", { timeout: 60_000 }, difficulty => {
    const { techniqueCap, requires, requiresCount = 1 } = ECLIPSE_CONFIG[difficulty]
    if (!requires) return
    // The quota, not one occurrence: a single hard step in a thirty-step solve is the tier below it.
    const demanding = boards(difficulty).filter(
      board =>
        solveEclipseByTechniques(board, techniquesUpTo(techniqueCap)).steps.filter(step =>
          requires.includes(step.technique)
        ).length >= requiresCount
    )
    expect(demanding.length).toBe(6)
  })

  it("leaves cells for the player rather than shipping the answer", () => {
    for (const board of boards("expert")) {
      expect(eclipseGivenCount(board)).toBeLessThan(board.size * board.size)
      expect(board.given.some(mark => mark === undefined)).toBe(true)
    }
  })

  it("draws the same board for the same seed", () => {
    const first = generateEclipse(9, ECLIPSE_CONFIG.master)
    const second = generateEclipse(9, ECLIPSE_CONFIG.master)
    expect(second.given as Mark[]).toEqual(first.given as Mark[])
    expect(second.links).toEqual(first.links)
  })
})
