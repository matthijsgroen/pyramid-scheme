import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import { BALANCE_CONFIG } from "./balanceConfig"
import { generateBalance } from "./generateBalance"
import {
  definitionOf,
  firstMistake,
  hasTwin,
  hasTwinnedPiece,
  nextStep,
  solveByTechniques,
  swapGlyph,
  TECHNIQUES,
  type BalancePuzzleData,
  type PanItem,
  type Scale,
} from "./techniques"

const piece = (item: string): PanItem =>
  /^\d+$/.test(item) ? { kind: "weight", value: +item } : { kind: "glyph", glyph: item }
const scale = (left: string, right: string): Scale => ({
  left: left.split(" ").map(piece),
  right: right.split(" ").map(piece),
})

const board = (glyphs: string[], scales: Scale[], maxValue = 12): BalancePuzzleData => ({ glyphs, scales, maxValue })

describe("reading a weight off a row", () => {
  it("reads a glyph standing alone against stones", () => {
    const puzzle = board(["a"], [scale("a 3", "8")])
    expect(nextStep(puzzle, {})).toMatchObject({ technique: "alone", decision: { glyph: "a", value: 5 } })
  })

  it("shares the stones out between equal glyphs", () => {
    const puzzle = board(["a"], [scale("a a a", "12")])
    expect(nextStep(puzzle, {})).toMatchObject({
      technique: "equalShares",
      decision: { glyph: "a", value: 4, count: 3, total: 12 },
    })
  })

  it("counts a glyph the player already weighed as part of the numbers", () => {
    const puzzle = board(["a", "b"], [scale("a b", "10")])
    expect(nextStep(puzzle, {})).toBeUndefined()
    expect(nextStep(puzzle, { b: 4 })).toMatchObject({ technique: "alone", decision: { glyph: "a", value: 6 } })
  })

  it("takes the difference between two rows that are the same apart from one glyph", () => {
    const puzzle = board(["a", "b"], [scale("a b", "10"), scale("a b b", "14")])
    expect(nextStep(puzzle, {})).toMatchObject({
      technique: "difference",
      decision: { glyph: "b", value: 4 },
      refs: [
        { kind: "scale", index: 0 },
        { kind: "scale", index: 1 },
      ],
    })
  })

  it("stays silent rather than claiming a weight no stone could be", () => {
    // 2a = 9 has no whole answer, and 1a = 40 is off the palette: both are boards a player's own
    // wrong weight can produce, and neither is something to say out loud.
    expect(nextStep(board(["a"], [scale("a a", "9")]), {})).toBeUndefined()
    expect(nextStep(board(["a"], [scale("a", "40")]), {})).toBeUndefined()
  })

  it("respects the cap it is given", () => {
    const puzzle = board(["a", "b"], [scale("a b", "10"), scale("a b b", "14")])
    expect(nextStep(puzzle, {}, [], "equalShares")).toBeUndefined()
    expect(solveByTechniques(puzzle, "equalShares").settled).toBe(false)
    expect(solveByTechniques(puzzle, "difference").settled).toBe(true)
  })
})

// The defect this ladder was rebuilt around: the solver used to cancel matching glyphs invisibly and
// then describe the result, so a hint called a glyph "the only one left" on a scale plainly holding
// four things. Cancelling is a move now, and the ladder suggests it before anything it unlocks.
describe("taking the same thing off both pans", () => {
  it("is the first thing suggested on a scale carrying the same glyph twice", () => {
    const puzzle = board(["a", "b"], [scale("a b 3", "b 9")])
    expect(nextStep(puzzle, {})).toMatchObject({
      technique: "cancelGlyph",
      glyph: "b",
      note: scale("a 3", "9"),
    })
  })

  it("suggests taking the stones off when that is what leaves a row worth having", () => {
    // `a 6 = b 2` cannot be read — two glyphs without numbers — but 2 off both sides leaves
    // `a 4 = b`, which says outright what a `b` is worth.
    const puzzle = board(["a", "b"], [scale("a 6", "b 2")])
    expect(nextStep(puzzle, {})).toMatchObject({ technique: "cancelStones", note: scale("a 4", "b") })
  })

  it("says nothing about stones on a row that can already be read", () => {
    // `a 3 = 9` has stones on both pans, but reading it is the move, not tidying it.
    expect(nextStep(board(["a"], [scale("a 3", "9")]), {})).toMatchObject({ technique: "alone" })
  })

  it("never writes a row that says nothing", () => {
    // `b = b` cancels to nothing at all, and `a 4 = a 4` to a bare pair of stones.
    expect(nextStep(board(["b"], [scale("b", "b")]), {})).toBeUndefined()
    expect(nextStep(board(["a"], [scale("a 4", "a 4")]), {})).toBeUndefined()
  })

  it("reads the weight off the row it just wrote", () => {
    const result = solveByTechniques(board(["a", "b"], [scale("a b 3", "b 9")]), "alone")
    expect(result.notes).toEqual([scale("a 3", "9")])
    expect(result.assignment).toEqual({ a: 6 })
  })

  it("only suggests a cancel that gets somewhere", () => {
    // Taking the `b` off both pans here ends at `a c = d 6` however far it is carried: three glyphs
    // and nothing to read. So the board says nothing rather than tidying for its own sake.
    const puzzle = board(["a", "b", "c", "d"], [scale("a b c 3", "b d 9")])
    expect(nextStep(puzzle, {}, [], "difference")).toBeUndefined()
  })
})

describe("swapping a glyph for what a row says it is worth", () => {
  it("is what a wizard board needs, and nothing below it settles one", () => {
    const puzzle = generateBalance(1, BALANCE_CONFIG.wizard)
    expect(solveByTechniques(puzzle, "difference").settled).toBe(false)
    const result = solveByTechniques(puzzle, "swap")
    expect(result.settled).toBe(true)
    expect(result.assignment).toEqual(puzzle.solution)
  })

  it("only trades from a row holding that glyph alone on a pan", () => {
    // `a b = 10` says nothing about a single `b` — its pan holds two things — so nothing can be
    // traded for it, however true the row is.
    expect(definitionOf(scale("a b", "10"), {})).toBeUndefined()
    expect(definitionOf(scale("b", "4 a"), {})).toEqual({ glyph: "b", equals: [piece("4"), piece("a")] })
  })

  it("puts the row's other pan in the glyph's place, and adds the loose stones up", () => {
    expect(swapGlyph(scale("a b 1", "20"), { glyph: "b", equals: [piece("4"), piece("a")] })).toEqual(
      scale("a a 5", "20")
    )
  })

  it("leaves a glyph alone when tapping it would cancel instead", () => {
    // `b` stands on both pans of the second row, so tapping it there takes both off — the board
    // could not start a swap from it, so the solver must not ask for one.
    const puzzle = board(["a", "b"], [scale("b", "4"), scale("a b", "b b 7")])
    expect(nextStep(puzzle, {}, [], "swap")?.technique).not.toBe("swap")
  })
})

// The board marks these and the rules mention the move only where they exist, so what the page says
// you can do and what it lets you do are the same thing (design doc §7).
describe("pieces that can come off both pans", () => {
  it("marks a glyph standing opposite itself, and numbers against numbers", () => {
    const row = scale("a b 3", "b 9")
    expect(hasTwin(row, piece("b"))).toBe(true)
    expect(hasTwin(row, piece("3"))).toBe(true)
    expect(hasTwin(row, piece("a"))).toBe(false)
    expect(hasTwinnedPiece(row)).toBe(true)
  })

  it("marks nothing on a row with a number on only one pan", () => {
    expect(hasTwinnedPiece(scale("a b", "10"))).toBe(false)
  })

  // Taking numbers off both pans IS a subtraction. On `a 7 = 15` it turns the board into `a = 8`,
  // which is the whole starter puzzle done for the player — so the tiers below the one that teaches
  // the move do not offer it at all.
  it("is not offered on a board that does not have the move", () => {
    const puzzle = { ...board(["a"], [scale("a 7", "15")]), cancelling: false }
    expect(nextStep(puzzle, {})).toMatchObject({ technique: "alone", decision: { glyph: "a", value: 8 } })
    expect(nextStep(puzzle, { a: 8 })).toBeUndefined()
    // The same board with the move on hands out `a = 8` for a tap, once the reading is used up.
    expect(nextStep({ ...puzzle, cancelling: true }, { a: 8 })).toBeUndefined()
  })

  it("keeps a board that needs cancelling from being generated below the tier that teaches it", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const puzzle = generateBalance(seed, BALANCE_CONFIG.starter)
      expect(puzzle.cancelling).toBe(false)
      expect(solveByTechniques(puzzle, puzzle.techniqueCap).settled).toBe(true)
    }
  })
})

describe("firstMistake", () => {
  it("finds a weight that contradicts the answer, and ignores the ones still missing", () => {
    expect(firstMistake(["a", "b"], { a: 3 }, { a: 3, b: 5 })).toBeUndefined()
    expect(firstMistake(["a", "b"], { a: 3, b: 2 }, { a: 3, b: 5 })).toBe("b")
  })
})

describe("the ladder as a whole", () => {
  // Rule 5 of the screen bar: a technique the solver claims must be reachable from a real board.
  it("every technique is demanded by some board the generator makes", () => {
    const demanded = new Set(
      difficulties.flatMap(difficulty =>
        Array.from({ length: 10 }, (_, seed) => generateBalance(seed + 1, BALANCE_CONFIG[difficulty])).flatMap(board =>
          solveByTechniques(board, board.techniqueCap).steps.map(step => step.technique)
        )
      )
    )
    expect([...TECHNIQUES].filter(technique => !demanded.has(technique))).toEqual([])
  })
})
