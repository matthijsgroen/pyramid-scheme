import { describe, expect, it } from "vitest"
import {
  applyFutoshikiTechniques,
  createFutoshikiBoard,
  firstFutoshikiMistake,
  nextFutoshikiStep,
  solveFutoshikiByTechniques,
  TECHNIQUES,
  type FutoshikiBoard,
  type FutoshikiConstraint,
  type FutoshikiPuzzleData,
  type FutoshikiValues,
  type TechniqueId,
} from "./techniques"
import { generateFutoshiki } from "./generateFutoshiki"
import { FUTOSHIKI_CONFIG } from "./futoshikiConfig"
import { difficulties } from "@/data/difficultyLevels"

const blankGrid = (size: number): FutoshikiValues =>
  Array.from({ length: size }, () => new Array<number | undefined>(size).fill(undefined))

const puzzleOf = (size: number, constraints: FutoshikiConstraint[], givens?: FutoshikiValues): FutoshikiPuzzleData => ({
  size,
  givens: givens ?? blankGrid(size),
  constraints,
})

const noNotes = (size: number) => Array.from({ length: size }, () => Array.from({ length: size }, () => [] as number[]))

// Each technique is asked for the FIRST thing it says once everything cheaper is spent — the position
// the solver actually reaches it from. Reading one in isolation would prove nothing about the ladder.
const spentBelow = (puzzle: FutoshikiPuzzleData, technique: TechniqueId): FutoshikiBoard => {
  const board = createFutoshikiBoard(puzzle, puzzle.givens)
  const below = TECHNIQUES[TECHNIQUES.indexOf(technique) - 1]
  if (below) applyFutoshikiTechniques(puzzle, board, below)
  return board
}

const stepFor = (puzzle: FutoshikiPuzzleData, technique: TechniqueId) =>
  nextFutoshikiStep(puzzle, spentBelow(puzzle, technique), technique)

// The last two rungs only matter on a board too sparse for the cheaper ones to finish, which no small
// grid of pre-filled numbers reproduces — every such grid falls to a single or a sign first. So these
// two are handed the candidate state directly, and their place in the ladder is covered instead by
// "respects the technique cap" and by the reachability sweep over real boards.
const boardOfCandidates = (candidates: number[][][]): FutoshikiBoard => ({
  size: candidates.length,
  values: blankGrid(candidates.length),
  candidates: candidates.map(row => row.map(values => new Set(values))),
})

describe("nextFutoshikiStep", () => {
  it("writes in the only number a square has left", () => {
    // Three of the four numbers already sit in this square's row and column.
    const givens = blankGrid(4)
    givens[0][1] = 2
    givens[0][2] = 3
    givens[1][0] = 4
    expect(stepFor(puzzleOf(4, [], givens), "nakedSingle")).toMatchObject({
      technique: "nakedSingle",
      params: { value: 1 },
      decisions: [{ kind: "place", row: 0, col: 0, value: 1 }],
    })
  })

  it("writes in a number that fits nowhere else in its row", () => {
    // 4 is barred from three squares of row 0 by its own column, leaving one home in that row.
    const givens = blankGrid(4)
    givens[1][0] = 4
    givens[1][1] = 1
    givens[2][1] = 4
    givens[3][2] = 4
    expect(stepFor(puzzleOf(4, [], givens), "hiddenSingle")).toMatchObject({
      technique: "hiddenSingle",
      variant: "row",
      params: { value: 4 },
      decisions: [{ kind: "place", row: 0, col: 3, value: 4 }],
    })
  })

  it("rules the top number out of a square something must be bigger than", () => {
    const puzzle = puzzleOf(4, [{ row: 0, col: 0, direction: "right", relation: "<" }])
    expect(stepFor(puzzle, "signBound")).toMatchObject({
      technique: "signBound",
      variant: "high",
      cells: [{ row: 0, col: 0 }],
      decisions: [{ kind: "eliminate", row: 0, col: 0, values: [4] }],
    })
  })

  it("rules out the half of the number line a placed neighbour closes off", () => {
    // 5 is already gone from the smaller square by the sign alone; the neighbour's 3 takes 4 with it.
    const givens = blankGrid(5)
    givens[0][1] = 3
    const puzzle = puzzleOf(5, [{ row: 0, col: 0, direction: "right", relation: "<" }], givens)
    expect(stepFor(puzzle, "signVsValue")).toMatchObject({
      technique: "signVsValue",
      variant: "less",
      params: { value: 3 },
      decisions: [{ kind: "eliminate", row: 0, col: 0, values: [4] }],
    })
  })

  it("caps a square by the whole staircase of signs rising away from it", () => {
    // Two squares rise away along row 0, so the first of the three tops out at 2.
    const puzzle = puzzleOf(4, [
      { row: 0, col: 0, direction: "right", relation: "<" },
      { row: 0, col: 1, direction: "right", relation: "<" },
    ])
    expect(stepFor(puzzle, "signChain")).toMatchObject({
      technique: "signChain",
      variant: "high",
      params: { chain: 2, bound: 2 },
      decisions: [{ kind: "eliminate", row: 0, col: 0, values: [3, 4] }],
    })
  })

  it("caps a square by what its unsettled neighbour across the sign can still hold", () => {
    // Neither side is settled: the 4 in column 0 leaves the bigger square on {2,3}, which caps the other.
    const givens = blankGrid(4)
    givens[3][0] = 4
    const puzzle = puzzleOf(4, [{ row: 0, col: 0, direction: "down", relation: ">" }], givens)
    expect(stepFor(puzzle, "signPair")).toMatchObject({
      technique: "signPair",
      variant: "less",
      cells: [
        { row: 1, col: 0 },
        { row: 0, col: 0 },
      ],
      params: { value: 3 },
      decisions: [{ kind: "eliminate", row: 1, col: 0, values: [3] }],
    })
  })

  it("keeps a pair of numbers to the two squares that own them", () => {
    // Rows 1 and 2 leave the top of columns 0 and 1 on {1,2} only, so 1 and 2 leave the rest of row 0.
    const givens = blankGrid(4)
    givens[1][0] = 3
    givens[2][0] = 4
    givens[1][1] = 4
    givens[2][1] = 3
    const step = stepFor(puzzleOf(4, [], givens), "nakedPair")
    expect(step).toMatchObject({ technique: "nakedPair", variant: "row", params: { first: 1, second: 2 } })
    expect(step?.decisions).toEqual([
      { kind: "eliminate", row: 0, col: 2, values: [1, 2] },
      { kind: "eliminate", row: 0, col: 3, values: [1, 2] },
    ])
  })

  it("hands a pair of squares to the two numbers that fit nowhere else in the line", () => {
    // In row 0 only the first two squares can still take a 1 or a 2, so between them they own both —
    // and nothing else may stay in either. Neither square is down to two candidates, so no naked pair
    // reaches this first.
    const all = [1, 2, 3, 4, 5]
    const board = boardOfCandidates([
      [
        [1, 2, 3],
        [1, 2, 4],
        [3, 4, 5],
        [3, 4, 5],
        [3, 4, 5],
      ],
      [all, all, all, all, all],
      [all, all, all, all, all],
      [all, all, all, all, all],
      [all, all, all, all, all],
    ])
    const step = nextFutoshikiStep(puzzleOf(5, []), board, "hiddenPair")
    expect(step).toMatchObject({ technique: "hiddenPair", variant: "row", params: { first: 1, second: 2 } })
    expect(step?.decisions).toEqual([
      { kind: "eliminate", row: 0, col: 0, values: [3] },
      { kind: "eliminate", row: 0, col: 1, values: [4] },
    ])
  })

  it("spends a number pinned to the same two columns in two separate rows", () => {
    // 1 fits only columns 0 and 1 in row 0, and only columns 0 and 1 in row 1. Whichever way round it
    // falls, both columns are spoken for — so 1 leaves those columns in every other row.
    const all = [1, 2, 3, 4]
    const board = boardOfCandidates([
      [
        [1, 2, 3],
        [1, 2, 3],
        [2, 3, 4],
        [2, 3, 4],
      ],
      [
        [1, 3, 4],
        [1, 3, 4],
        [2, 3, 4],
        [2, 3, 4],
      ],
      [all, all, all, all],
      [all, all, all, all],
    ])
    const step = nextFutoshikiStep(puzzleOf(4, []), board, "xWing")
    expect(step).toMatchObject({ technique: "xWing", variant: "row", params: { value: 1 } })
    expect(step?.cells).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ])
    expect(step?.decisions).toEqual([
      { kind: "eliminate", row: 2, col: 0, values: [1] },
      { kind: "eliminate", row: 3, col: 0, values: [1] },
      { kind: "eliminate", row: 2, col: 1, values: [1] },
      { kind: "eliminate", row: 3, col: 1, values: [1] },
    ])
  })

  it("respects the technique cap — a board says nothing a lower ladder cannot reach", () => {
    const puzzle = puzzleOf(4, [
      { row: 0, col: 0, direction: "right", relation: "<" },
      { row: 0, col: 1, direction: "right", relation: "<" },
    ])
    const board = spentBelow(puzzle, "signChain")
    expect(nextFutoshikiStep(puzzle, board, "signChain")?.technique).toBe("signChain")
    expect(nextFutoshikiStep(puzzle, board, "signVsValue")).toBeUndefined()
  })

  it("reasons from the player's own notes, so an elimination is never offered twice", () => {
    const puzzle = puzzleOf(4, [{ row: 0, col: 0, direction: "right", relation: "<" }])
    expect(nextFutoshikiStep(puzzle, createFutoshikiBoard(puzzle, puzzle.givens))).toMatchObject({
      cells: [{ row: 0, col: 0 }],
    })
    const notes = noNotes(4)
    notes[0][0] = [1, 2, 3]
    expect(nextFutoshikiStep(puzzle, createFutoshikiBoard(puzzle, puzzle.givens, notes))?.cells).not.toEqual([
      { row: 0, col: 0 },
    ])
  })

  it("ignores notes that would leave a square with nothing, rather than trusting them", () => {
    const puzzle = puzzleOf(4, [])
    const notes = noNotes(4)
    const givens = blankGrid(4)
    givens[0][1] = 1
    notes[0][0] = [1]
    expect(createFutoshikiBoard(puzzle, givens, notes).candidates[0][0]).toEqual(new Set([2, 3, 4]))
  })
})

describe("solveFutoshikiByTechniques", () => {
  it("leaves a board that needs a guess unsettled rather than guessing", () => {
    // Two numbers, no signs, no pre-filled squares: both arrangements of a 2x2 grid are valid.
    expect(solveFutoshikiByTechniques(puzzleOf(2, [])).settled).toBe(false)
  })

  it("reports the strongest technique a board demanded", () => {
    const board = generateFutoshiki(FUTOSHIKI_CONFIG.starter.size, 7, FUTOSHIKI_CONFIG.starter)
    const { deepest } = solveFutoshikiByTechniques(board, board.techniqueCap)
    expect(TECHNIQUES.indexOf(deepest!)).toBeLessThanOrEqual(TECHNIQUES.indexOf("signVsValue"))
  })
})

describe("firstFutoshikiMistake", () => {
  const solution = [
    [1, 2],
    [2, 1],
  ]

  it("finds a number that contradicts the answer", () => {
    const values = blankGrid(2)
    values[0][0] = 2
    expect(firstFutoshikiMistake(values, noNotes(2), solution)).toEqual({ row: 0, col: 0, kind: "value" })
  })

  it("finds notes that have ruled out the number that belongs there", () => {
    const notes = noNotes(2)
    notes[0][0] = [2]
    expect(firstFutoshikiMistake(blankGrid(2), notes, solution)).toEqual({ row: 0, col: 0, kind: "note" })
  })

  it("accepts notes that still hold the right number", () => {
    const notes = noNotes(2)
    notes[0][0] = [1, 2]
    expect(firstFutoshikiMistake(blankGrid(2), notes, solution)).toBeUndefined()
  })

  it("ignores notes left behind under a number already written in", () => {
    const values = blankGrid(2)
    values[0][0] = 1
    const notes = noNotes(2)
    notes[0][0] = [2]
    expect(firstFutoshikiMistake(values, notes, solution)).toBeUndefined()
  })
})

describe("every technique", () => {
  // Generating forty real boards is seconds of honest work, so this one carries its own timeout
  // rather than being thinned to fit the default: the strongest technique only surfaces on a wizard
  // board, and six seeds a tier is the point where it reliably does.
  it("is reachable — each one fires on a real board", () => {
    const fired = new Set<string>()
    for (const difficulty of difficulties) {
      const { size, ...options } = FUTOSHIKI_CONFIG[difficulty]
      for (let seed = 1; seed <= 8; seed++) {
        const board = generateFutoshiki(size, seed, options)
        for (const step of solveFutoshikiByTechniques(board, board.techniqueCap).steps) fired.add(step.technique)
      }
    }
    expect([...TECHNIQUES].filter(technique => !fired.has(technique))).toEqual([])
  }, 30_000)
})
