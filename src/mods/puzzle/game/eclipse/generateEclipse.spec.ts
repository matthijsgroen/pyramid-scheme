import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { eclipseSolved, lines, type Mark } from "./eclipse"
import { ECLIPSE_CONFIG } from "./eclipseConfig"
import { eclipseGivenCount, generateEclipse, techniquesUpTo, type EclipseOptions } from "./generateEclipse"
import { solveEclipseByTechniques } from "./techniques"

const boards = (difficulty: (typeof difficulties)[number], count = 6) =>
  Array.from({ length: count }, (_unused, seed) => generateEclipse(seed + 1, ECLIPSE_CONFIG[difficulty]))

const variantBoards = (options: EclipseOptions, count = 4) =>
  Array.from({ length: count }, (_unused, seed) => generateEclipse(seed + 1, options))

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
      // The variant the seed drew is part of which ladder the board was accepted under.
      for (const board of boards(difficulty)) {
        const result = solveEclipseByTechniques(board, techniquesUpTo(board.techniqueCap, board.variant))
        expect(result.settled).toBe(true)
        expect(result.marks).toEqual([...board.solution])
        // Deduction settles it, so it has exactly one solution — nothing was ever guessed.
        expect(result.steps.length).toBeGreaterThan(0)
      }
    }
  )

  it.each(difficulties)("makes a %s board demand the rung its tier introduces", { timeout: 60_000 }, difficulty => {
    const { requires, requiresCount = 1 } = ECLIPSE_CONFIG[difficulty]
    if (!requires) return
    // The quota, not one occurrence: a single hard step in a thirty-step solve is the tier below it.
    const demanding = boards(difficulty).filter(board => {
      const allowed = techniquesUpTo(board.techniqueCap, board.variant)
      return (
        solveEclipseByTechniques(board, allowed).steps.filter(
          step => requires.includes(step.technique) && allowed.includes(step.technique)
        ).length >= requiresCount
      )
    })
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
    expect(second.variant).toBe(first.variant)
    expect(second.given as Mark[]).toEqual(first.given as Mark[])
    expect(second.links).toEqual(first.links)
  })
})

describe("eclipse variants", () => {
  it.each(difficulties)("draws every variant %s lists, across its seeds", { timeout: 120_000 }, difficulty => {
    const listed = ECLIPSE_CONFIG[difficulty].variants ?? ["mixed"]
    // One attempt a seed: the variant is drawn before any board, so this asks what the seeds pick rather
    // than what they manage to build.
    const drawn = new Set(
      Array.from({ length: 30 }, (_unused, seed) => generateEclipse(seed + 1, ECLIPSE_CONFIG[difficulty], 1).variant)
    )
    expect([...drawn].sort()).toEqual([...listed].sort())
  })

  it("keeps a required rung for every variant a tier lists", () => {
    for (const difficulty of difficulties) {
      const options = ECLIPSE_CONFIG[difficulty]
      if (!options.requires) continue
      for (const variant of options.variants ?? ["mixed"]) {
        const allowed = techniquesUpTo(options.techniqueCap, variant)
        expect(options.requires.filter(id => allowed.includes(id))).not.toEqual([])
      }
    }
  })

  it("ships a signless board with no signs on it, settled by the grid rules alone", { timeout: 60_000 }, () => {
    const options = { ...ECLIPSE_CONFIG.expert, variants: ["signless" as const] }
    for (const board of variantBoards(options)) {
      expect(board.links).toEqual([])
      const result = solveEclipseByTechniques(board, techniquesUpTo(board.techniqueCap, "signless"))
      expect(result.marks).toEqual([...board.solution])
      expect(result.steps.map(step => step.technique)).not.toContain("sign")
    }
  })

  it("settles a copyFree board without ever reading one line against another", { timeout: 60_000 }, () => {
    const options = { ...ECLIPSE_CONFIG.expert, variants: ["copyFree" as const] }
    for (const board of variantBoards(options)) {
      const result = solveEclipseByTechniques(board, techniquesUpTo(board.techniqueCap, "copyFree"))
      expect(result.marks).toEqual([...board.solution])
      expect(result.steps.map(step => step.technique)).not.toContain("noCopy")
      // The rule still holds, even though no step of the solve had to spend it.
      expect(eclipseSolved(board, { marks: board.solution })).toBe(true)
    }
  })
})
