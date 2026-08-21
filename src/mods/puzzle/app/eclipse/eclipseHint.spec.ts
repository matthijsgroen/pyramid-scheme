import { describe, expect, it } from "vitest"
import { createEclipseState, other, type Mark } from "@/mods/puzzle/game/eclipse/eclipse"
import { difficulties } from "@/data/difficultyLevels"
import { ECLIPSE_CONFIG } from "@/mods/puzzle/game/eclipse/eclipseConfig"
import { generateEclipse, techniquesUpTo } from "@/mods/puzzle/game/eclipse/generateEclipse"
import { nextEclipseStep } from "@/mods/puzzle/game/eclipse/techniques"
import { buildEclipseHint } from "./eclipseHint"

const board = generateEclipse(5, ECLIPSE_CONFIG.expert)

describe("eclipse hints", () => {
  it("names a move on a fresh board, and points at what it reasons from", () => {
    const hint = buildEclipseHint(board, createEclipseState(board), board.solution)
    expect(hint).toBeDefined()
    expect(hint!.cells.size).toBeGreaterThan(0)
  })

  it("calls out a wrong mark before advising anything else", () => {
    const empty = createEclipseState(board)
    const wrongCell = board.given.findIndex(mark => mark === undefined)
    const marks: (Mark | undefined)[] = [...empty.marks]
    marks[wrongCell] = other(board.solution[wrongCell])
    const hint = buildEclipseHint(board, { marks }, board.solution)
    expect(hint?.key).toBe("mistake")
    expect([...hint!.cells]).toEqual([wrongCell])
  })

  it("runs out of advice only once the board is done", () => {
    const solved = buildEclipseHint(board, { marks: [...board.solution] }, board.solution)
    expect(solved).toBeUndefined()
  })

  it("never advises a guess, on any tier", { timeout: 60_000 }, () => {
    // Every reason the family can give is a forward deduction. There is deliberately no rung that says "try a
    // mark and see the board break": a board only ships if the ladder settles it step by step.
    for (const difficulty of difficulties) {
      const board = generateEclipse(2, ECLIPSE_CONFIG[difficulty])
      const marks = [...board.given]
      for (let guard = 0; guard < 200; guard++) {
        const hint = buildEclipseHint(board, { marks }, board.solution)
        if (!hint) break
        expect(hint.key).not.toMatch(/contradiction|guess/)
        const step = nextEclipseStep(board, [...marks], techniquesUpTo(board.techniqueCap))!
        for (const decision of step.decisions) marks[decision.cell] = decision.mark
      }
      // And the ladder really did finish it, rather than running out of things to say.
      expect(marks.every(mark => mark !== undefined)).toBe(true)
    }
  })

  it("stays inside the ladder the board was accepted under", () => {
    const starter = generateEclipse(3, ECLIPSE_CONFIG.starter)
    const hint = buildEclipseHint(starter, createEclipseState(starter), starter.solution)
    // A starter board is capped at the no-three rung, so its advice can never be the counting one.
    expect(["sign.same", "sign.different", "noTriple.pair", "noTriple.sandwich"]).toContain(hint?.key)
  })
})
