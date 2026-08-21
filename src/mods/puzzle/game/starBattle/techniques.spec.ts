import { describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { cellAt, type StarBattlePuzzle } from "./starBattle"
import { STAR_BATTLE_CONFIG } from "./starBattleConfig"
import { generateStarBattle, techniquesUpTo } from "./generateStarBattle"
import {
  nextStarBattleStep,
  solveStarBattleByTechniques,
  STAR_BATTLE_TECHNIQUES,
  techniqueRank,
  type Marks,
  type StarBattleTechniqueId,
} from "./techniques"

/** A board with the regions as horizontal bands, so a test can say where a region is without drawing one. */
const bands = (size: number): StarBattlePuzzle => ({
  size,
  quota: 1,
  regions: Array.from({ length: size * size }, (_unused, cell) => Math.floor(cell / size)),
})

const empty = (puzzle: StarBattlePuzzle): Marks => new Array(puzzle.size * puzzle.size).fill(undefined)

describe("star battle techniques", () => {
  it("rules out the ring around a star", () => {
    const puzzle = bands(5)
    const marks = empty(puzzle)
    marks[cellAt(5, 2, 2)] = "star"
    const step = nextStarBattleStep(puzzle, marks, ["touch"])
    expect(step?.technique).toBe("touch")
    expect(step?.decisions.map(d => d.cell).sort((a, b) => a - b)).toEqual([6, 7, 8, 11, 13, 16, 17, 18])
    expect(step?.decisions.every(d => d.mark === "dark")).toBe(true)
  })

  it("empties a group that already holds its star, and names which kind of group it was", () => {
    const puzzle = bands(5)
    const marks = empty(puzzle)
    // Row 0 is also region 0 on a banded board, so the row is what the cheapest reading points at.
    marks[cellAt(5, 0, 0)] = "star"
    const step = nextStarBattleStep(puzzle, marks, ["groupFull"])
    expect(step?.variant).toBe("row")
    expect(step?.decisions.map(d => d.cell)).toEqual([1, 2, 3, 4])
  })

  it("places the star when a group is down to one square", () => {
    const puzzle = bands(5)
    const marks = empty(puzzle)
    // Row 0 emptied but for its last square: the star has nowhere else to go.
    for (const cell of [0, 1, 2, 3]) marks[cell] = "dark"
    const step = nextStarBattleStep(puzzle, marks, ["groupTight"])
    expect(step?.technique).toBe("groupTight")
    expect(step?.decisions).toEqual([{ cell: 4, mark: "star" }])
  })

  it("spends a line's star on the region squeezed into it, and vice versa", () => {
    // Region 1 IS row 1 on a banded board, so the two readings are each other's converse here: whichever
    // side is squeezed, the star belongs to the overlap and the rest of the other group is dark.
    const puzzle = bands(4)
    const marks = empty(puzzle)
    // Column 0 can only take its star from row 1, since rows 0, 2 and 3 are dark there.
    for (const row of [0, 2, 3]) marks[cellAt(4, row, 0)] = "dark"
    const step = nextStarBattleStep(puzzle, marks, ["lineRegion"])
    expect(step?.technique).toBe("lineRegion")
    expect(step?.variant).toBe("col")
    // That column's star is region 1's only one, so the rest of region 1 holds none.
    expect(step?.decisions.map(d => d.cell)).toEqual([5, 6, 7])
  })

  it("takes the cheapest reason available, not the strongest", () => {
    const puzzle = bands(5)
    const marks = empty(puzzle)
    marks[cellAt(5, 0, 0)] = "star"
    // A star on the board makes both `touch` and `groupFull` available; the ladder answers with the first.
    expect(nextStarBattleStep(puzzle, marks)?.technique).toBe("touch")
  })

  it("says nothing when nothing is forced", () => {
    const puzzle = bands(6)
    expect(nextStarBattleStep(puzzle, empty(puzzle))).toBeUndefined()
  })
})

describe("the ladder", () => {
  it("lists every rung exactly once, in rank order", () => {
    expect(new Set(STAR_BATTLE_TECHNIQUES).size).toBe(STAR_BATTLE_TECHNIQUES.length)
    expect(STAR_BATTLE_TECHNIQUES.map(techniqueRank)).toEqual(STAR_BATTLE_TECHNIQUES.map((_unused, at) => at))
  })

  /**
   * Every rung the solver claims has to be reachable from a board the generator actually draws
   * (`puzzle-screens.md` §7.5). A technique no tier can trigger is a technique that has never been read.
   */
  it("is a ladder real boards climb, every rung of it", { timeout: 120_000 }, () => {
    const tiers: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]
    const seen = new Set<StarBattleTechniqueId>()
    for (const tier of tiers) {
      const options = STAR_BATTLE_CONFIG[tier]
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const board = generateStarBattle(seed, options)
        const { steps } = solveStarBattleByTechniques(board, techniquesUpTo(options.techniqueCap))
        for (const step of steps) seen.add(step.technique)
      }
    }
    expect([...seen].sort()).toEqual([...STAR_BATTLE_TECHNIQUES].sort())
  })
})
