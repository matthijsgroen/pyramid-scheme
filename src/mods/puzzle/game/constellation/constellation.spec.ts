import { describe, expect, it } from "vitest"
import {
  constellationSolved,
  createConstellationState,
  crossingsByPair,
  cycleConstellationLine,
  firstConstellationMistake,
  overfilledStars,
  pairsOf,
  undoConstellation,
  type ConstellationPuzzle,
  type Star,
} from "./constellation"

/**
 * A 5×5 sky used by most of these: three stars in a row-and-column L, and one apart from them.
 *
 * ```
 *  A . . . B
 *  . . . . .
 *  . . . . .
 *  . . . . .
 *  C . . . .
 * ```
 */
const stars: Star[] = [
  { cell: 0, count: 3 },
  { cell: 4, count: 1 },
  { cell: 20, count: 2 },
]
const sky: ConstellationPuzzle = { size: 5, stars, pairs: pairsOf(5, stars) }

describe("pairsOf", () => {
  it("joins each star to its nearest neighbour along a row and a column", () => {
    expect(sky.pairs).toEqual([
      { a: 0, b: 1 },
      { a: 0, b: 2 },
    ])
  })

  it("never reaches past a star, because a line stops at the first one it meets", () => {
    const row: Star[] = [
      { cell: 0, count: 1 },
      { cell: 2, count: 2 },
      { cell: 4, count: 1 },
    ]
    expect(pairsOf(5, row)).toEqual([
      { a: 0, b: 1 },
      { a: 1, b: 2 },
    ])
  })
})

describe("crossingsByPair", () => {
  it("crosses only where one line runs strictly through the other", () => {
    // A horizontal pair on row 2 and a vertical pair on column 2, meeting in the middle.
    const crossed: Star[] = [
      { cell: 10, count: 1 },
      { cell: 14, count: 1 },
      { cell: 2, count: 1 },
      { cell: 22, count: 1 },
    ]
    const puzzle = { size: 5, stars: crossed, pairs: pairsOf(5, crossed) }
    const across = puzzle.pairs.findIndex(pair => pair.a === 0 && pair.b === 1)
    const down = puzzle.pairs.findIndex(pair => pair.a === 2 && pair.b === 3)
    expect(crossingsByPair(puzzle)[across]).toEqual([down])
  })

  it("does not count two lines that share a star as crossing", () => {
    expect(crossingsByPair(sky)).toEqual([[], []])
  })
})

describe("cycleConstellationLine", () => {
  it("goes none → single → double → none", () => {
    let state = createConstellationState(sky)
    expect(state.lines[0]).toBe(0)
    state = cycleConstellationLine(sky, state, 0)
    expect(state.lines[0]).toBe(1)
    state = cycleConstellationLine(sky, state, 0)
    expect(state.lines[0]).toBe(2)
    state = cycleConstellationLine(sky, state, 0)
    expect(state.lines[0]).toBe(0)
  })

  it("refuses a line that would cross one already drawn", () => {
    const crossed: Star[] = [
      { cell: 10, count: 1 },
      { cell: 14, count: 1 },
      { cell: 2, count: 1 },
      { cell: 22, count: 1 },
    ]
    const puzzle = { size: 5, stars: crossed, pairs: pairsOf(5, crossed) }
    const across = puzzle.pairs.findIndex(pair => pair.a === 0 && pair.b === 1)
    const down = puzzle.pairs.findIndex(pair => pair.a === 2 && pair.b === 3)
    const drawn = cycleConstellationLine(puzzle, createConstellationState(puzzle), across)
    expect(cycleConstellationLine(puzzle, drawn, down)).toBe(drawn)
  })

  it("steps back one line at a time", () => {
    const drawn = cycleConstellationLine(sky, createConstellationState(sky), 0)
    expect(undoConstellation(drawn).lines[0]).toBe(0)
  })
})

describe("overfilledStars", () => {
  it("names a star holding more lines than its number", () => {
    const doubled = cycleConstellationLine(sky, cycleConstellationLine(sky, createConstellationState(sky), 0), 0)
    expect([...overfilledStars(sky, doubled)]).toEqual([1])
  })
})

describe("constellationSolved", () => {
  it("needs every number met", () => {
    const partial = cycleConstellationLine(sky, createConstellationState(sky), 0)
    expect(constellationSolved(sky, partial)).toBe(false)
  })

  it("needs one constellation, not two", () => {
    // Two separate pairs, each satisfied on its own: every number met, and still two constellations.
    const split: Star[] = [
      { cell: 0, count: 1 },
      { cell: 3, count: 1 },
      { cell: 15, count: 1 },
      { cell: 18, count: 1 },
    ]
    const puzzle = { size: 5, stars: split, pairs: pairsOf(5, split) }
    const top = puzzle.pairs.findIndex(pair => pair.a === 0 && pair.b === 1)
    const bottom = puzzle.pairs.findIndex(pair => pair.a === 2 && pair.b === 3)
    const lines = puzzle.pairs.map((_unused, index) => (index === top || index === bottom ? 1 : 0))
    expect(constellationSolved(puzzle, { lines })).toBe(false)
  })

  it("accepts a sky where every number is met and every star is reached", () => {
    expect(constellationSolved(sky, { lines: [1, 2] })).toBe(true)
  })
})

describe("firstConstellationMistake", () => {
  it("reports a line the answer does not hold, and stays quiet about one not drawn yet", () => {
    expect(firstConstellationMistake([1, 0], [1, 2])).toBeUndefined()
    expect(firstConstellationMistake([2, 0], [1, 2])).toBe(0)
  })
})
