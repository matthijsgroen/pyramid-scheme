import { describe, expect, it } from "vitest"
import {
  applySudokuTechniques,
  boxIndexOf,
  createSudokuBoard,
  firstSudokuMistake,
  nextSudokuStep,
  peersOf,
  solveSudokuByTechniques,
  sudokuCellKey,
  TECHNIQUES,
  unitsOf,
  type SudokuBoard,
  type SudokuPuzzleData,
  type SudokuValues,
  type TechniqueId,
} from "./techniques"
import { generateSudoku, SUDOKU_BOX_HEIGHT, SUDOKU_BOX_WIDTH, SUDOKU_SIZE } from "./generateSudoku"
import { SUDOKU_CONFIG } from "./sudokuConfig"
import { DEMANDS, demandOf, techniquesFor } from "./demands"
import { difficulties } from "@/data/difficultyLevels"

const shape = { size: SUDOKU_SIZE, boxWidth: SUDOKU_BOX_WIDTH, boxHeight: SUDOKU_BOX_HEIGHT }

const blankGrid = (size: number): SudokuValues =>
  Array.from({ length: size }, () => new Array<number | undefined>(size).fill(undefined))

const puzzleOf = (givens: SudokuValues): SudokuPuzzleData => ({ ...shape, givens })

const noNotes = (size: number) => Array.from({ length: size }, () => Array.from({ length: size }, () => [] as number[]))

// Each technique is asked for the FIRST thing it says once everything cheaper is spent — the position
// the solver actually reaches it from. Reading one in isolation would prove nothing about the ladder.
const spentBelow = (puzzle: SudokuPuzzleData, technique: TechniqueId): SudokuBoard => {
  const board = createSudokuBoard(puzzle, puzzle.givens)
  const below = TECHNIQUES.slice(0, TECHNIQUES.indexOf(technique))
  if (below.length) applySudokuTechniques(board, below)
  return board
}

const stepFor = (puzzle: SudokuPuzzleData, technique: TechniqueId) =>
  nextSudokuStep(spentBelow(puzzle, technique), TECHNIQUES.slice(0, TECHNIQUES.indexOf(technique) + 1))

/**
 * A board handed its candidates directly, for the rungs no small grid of given values reproduces.
 *
 * The three rungs above the naked single need a board mid-solve: on a 6x6 the exclusions a couple of
 * given values make are too coarse to leave one of them as the cheapest thing that fires — a chamber
 * pinning a value to one of its rows, drawn with givens alone, always pins it with values that have
 * already emptied the rest of that row. Their place in the ladder is covered instead by the tier
 * sweep at the bottom of this file, which runs them on the boards the family really ships.
 */
const boardOfCandidates = (candidates: number[][][]): SudokuBoard => ({
  puzzle: puzzleOf(blankGrid(6)),
  values: blankGrid(6),
  candidates: candidates.map(row => row.map(values => new Set(values))),
})

const ALL = [1, 2, 3, 4, 5, 6]

/** Six full squares, with the ones named narrowed — the shape every hand-built board below takes. */
const narrowed = (pairs: Record<string, number[]>): number[][][] =>
  Array.from({ length: 6 }, (_unused, row) =>
    Array.from({ length: 6 }, (_unused2, col) => pairs[`${row},${col}`] ?? ALL)
  )

describe("the grid and how it is divided", () => {
  it("stands three chambers across and two down, each two squares wide and three tall", () => {
    // The shape the family is authored at, and the one thing about it a glance has to settle.
    expect(boxIndexOf(shape, 0, 0)).toBe(0)
    expect(boxIndexOf(shape, 0, 1)).toBe(0)
    expect(boxIndexOf(shape, 2, 0)).toBe(0) // three rows tall
    expect(boxIndexOf(shape, 3, 0)).toBe(3) // the second row of chambers starts here
    expect(boxIndexOf(shape, 0, 2)).toBe(1)
    expect(boxIndexOf(shape, 5, 5)).toBe(5)
  })

  it("gives every square a chamber of six, and lets no chamber straddle another", () => {
    const chambers = unitsOf(shape).filter(unit => unit.kind === "box")
    expect(chambers).toHaveLength(6)
    for (const chamber of chambers) {
      expect(chamber.cells).toHaveLength(6)
      expect(new Set(chamber.cells.map(cell => boxIndexOf(shape, cell.row, cell.col))).size).toBe(1)
    }
  })

  it("counts a square's neighbourhood as its row, its column and its chamber, each square once", () => {
    // 5 along the row + 5 down the column + 5 in the chamber, less the 3 that are both.
    const peers = peersOf(shape, 0, 0)
    expect(new Set(peers.map(cell => sudokuCellKey(cell.row, cell.col))).size).toBe(peers.length)
    expect(peers).toHaveLength(12)
  })
})

describe("nextSudokuStep", () => {
  it("writes in the only value a square has left", () => {
    // Five of the six values already stand in this square's row, column or chamber.
    const givens = blankGrid(6)
    givens[0][1] = 2
    givens[0][2] = 3
    givens[0][3] = 4
    givens[1][0] = 5
    givens[2][0] = 6
    expect(stepFor(puzzleOf(givens), "nakedSingle")).toMatchObject({
      technique: "nakedSingle",
      params: { value: 1 },
      decisions: [{ kind: "place", row: 0, col: 0, value: 1 }],
    })
  })

  it("writes in a value that fits nowhere else in its chamber", () => {
    // Every other square of the top-left chamber has ruled 1 out, so 1 goes here — even though this
    // square could still hold a 2. The reason a row or a column cannot give: nothing about this
    // square's own line says anything at all.
    const board = boardOfCandidates(
      narrowed({
        "0,0": [1, 2],
        "0,1": [2, 3],
        "1,0": [3, 4],
        "1,1": [4, 5],
        "2,0": [5, 6],
        "2,1": [2, 6],
      })
    )
    expect(nextSudokuStep(board, ["nakedSingle", "hiddenSingle"])).toMatchObject({
      technique: "hiddenSingle",
      variant: "box",
      params: { value: 1 },
      decisions: [{ kind: "place", row: 0, col: 0, value: 1 }],
    })
  })

  it("argues a hidden single from the squares that shut the rest of the group out", () => {
    // Three 1s off row 0 between them close five of its six squares: one down column 1, and two that
    // each close a chamber's worth of the row. They are the whole reason, and none of them stands on
    // the row it decides — so the hint has to be able to point at them.
    const givens = blankGrid(6)
    givens[1][2] = 1
    givens[2][4] = 1
    givens[3][1] = 1
    const step = nextSudokuStep(createSudokuBoard(puzzleOf(givens), givens), ["hiddenSingle"])
    expect(step).toMatchObject({
      technique: "hiddenSingle",
      variant: "row",
      cells: [{ row: 0, col: 0 }],
      params: { value: 1 },
    })
    expect(step?.evidence).toEqual([
      { row: 3, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 4 },
    ])
  })

  it("clears a line of a value its chamber has pinned to one row of it", () => {
    // In the top-left chamber the 1 can only stand on row 2 — so it IS somewhere on row 2, and the
    // rest of that row cannot have it.
    const board = boardOfCandidates(
      narrowed({
        "0,0": [2, 3],
        "0,1": [2, 3],
        "1,0": [4, 5],
        "1,1": [4, 5],
        "2,0": [1, 6],
        "2,1": [1, 6],
      })
    )
    const step = nextSudokuStep(board, ["nakedSingle", "hiddenSingle", "pointing"])
    expect(step).toMatchObject({ technique: "pointing", variant: "row", params: { value: 1 } })
    expect(step?.decisions.every(decision => decision.kind === "eliminate")).toBe(true)
    // What it argues FROM is the two squares in the chamber; what it SETTLES is the rest of the row.
    expect(step?.evidence).toEqual([
      { row: 2, col: 0 },
      { row: 2, col: 1 },
    ])
    expect(step?.cells).toEqual([
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
    ])
  })

  it("clears a chamber of a value a line has pinned inside it", () => {
    // Along row 0 the 1 fits only in the two squares that belong to the top-left chamber — so the 1 of
    // that chamber is on row 0, and the rest of the chamber cannot have it. The mirror of the reason
    // above, read from the line's side.
    const board = boardOfCandidates(
      narrowed({
        "0,0": [1, 2],
        "0,1": [1, 3],
        "0,2": [4, 5],
        "0,3": [4, 6],
        "0,4": [5, 6],
        "0,5": [2, 3],
      })
    )
    const step = nextSudokuStep(board, TECHNIQUES)
    expect(step).toMatchObject({ technique: "claiming", variant: "row", params: { value: 1 } })
    expect(step?.evidence).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ])
    expect(step?.cells.every(cell => boxIndexOf(shape, cell.row, cell.col) === 0 && cell.row > 0)).toBe(true)
  })

  it("says nothing at all about a board with nothing forced on it", () => {
    expect(nextSudokuStep(createSudokuBoard(puzzleOf(blankGrid(6)), blankGrid(6)))).toBeUndefined()
  })

  it("reads the player's notes as the narrowing they are", () => {
    // Nothing is forced by the givens alone, but the player has pencilled this square down to one
    // value — so the board they are looking at does force it.
    const puzzle = puzzleOf(blankGrid(6))
    const notes = noNotes(6)
    notes[0][0] = [4]
    expect(nextSudokuStep(createSudokuBoard(puzzle, blankGrid(6), notes))).toMatchObject({
      technique: "nakedSingle",
      decisions: [{ kind: "place", row: 0, col: 0, value: 4 }],
    })
  })

  it("ignores notes that leave a square with nothing, rather than trusting them", () => {
    // A slip of the pencil must not make a board undecidable.
    const givens = blankGrid(6)
    givens[0][1] = 1
    const notes = noNotes(6)
    notes[0][0] = [1]
    const board = createSudokuBoard(puzzleOf(givens), givens, notes)
    expect(board.candidates[0][0].size).toBeGreaterThan(0)
  })
})

describe("solveSudokuByTechniques", () => {
  it("respects the ladder it is given, and stalls rather than reaching past it", () => {
    // A board that needs the chamber-line rung is left standing by the singles alone, which is exactly
    // what "this board demands boxLine" means (design doc §5.3).
    const board = generateSudoku(4, SUDOKU_CONFIG.wizard)
    expect(solveSudokuByTechniques(board, techniquesFor("boxLine")).settled).toBe(true)
    expect(solveSudokuByTechniques(board, techniquesFor("hiddenSingle")).settled).toBe(false)
  })

  it("leaves a board that needs a guess unsettled rather than guessing", () => {
    expect(solveSudokuByTechniques(puzzleOf(blankGrid(6))).settled).toBe(false)
  })

  it("reports the strongest technique a board demanded", () => {
    const board = generateSudoku(1, SUDOKU_CONFIG.starter)
    const { deepest } = solveSudokuByTechniques(board, techniquesFor(board.techniqueCap))
    expect(deepest).toBe("nakedSingle")
  })
})

describe("firstSudokuMistake", () => {
  const solved = generateSudoku(1, SUDOKU_CONFIG.starter)

  it("finds a value that contradicts the answer", () => {
    const values = blankGrid(6)
    const wrong = (solved.solution[0][0] % 6) + 1
    values[0][0] = wrong
    expect(firstSudokuMistake(values, noNotes(6), solved.solution)).toEqual({ row: 0, col: 0, kind: "value" })
  })

  it("finds notes that have ruled out the value that belongs there", () => {
    const notes = noNotes(6)
    notes[0][0] = [(solved.solution[0][0] % 6) + 1]
    expect(firstSudokuMistake(blankGrid(6), notes, solved.solution)).toEqual({ row: 0, col: 0, kind: "note" })
  })

  it("accepts notes that still hold the right value", () => {
    const notes = noNotes(6)
    notes[0][0] = [solved.solution[0][0], (solved.solution[0][0] % 6) + 1]
    expect(firstSudokuMistake(blankGrid(6), notes, solved.solution)).toBeUndefined()
  })

  it("ignores notes left behind under a value already written in", () => {
    const values = blankGrid(6)
    values[0][0] = solved.solution[0][0]
    const notes = noNotes(6)
    notes[0][0] = [(solved.solution[0][0] % 6) + 1]
    expect(firstSudokuMistake(values, notes, solved.solution)).toBeUndefined()
  })
})

describe("every rung a tier can ask for", () => {
  // The sweep is over the DEMANDS, not the four techniques, because the demands are what generation
  // promises (design doc §5.2). Which SIDE of the chamber-line rung a board turns on — the chamber's
  // or the line's — is a finer reason the hint layer names and no tier asks for; both are covered by
  // their own boards above.
  it("is reachable — each one fires on a real board", () => {
    const fired = new Set<string>()
    for (const difficulty of difficulties)
      for (let seed = 1; seed <= 4; seed++) {
        const board = generateSudoku(seed, SUDOKU_CONFIG[difficulty])
        for (const step of solveSudokuByTechniques(board, techniquesFor(board.techniqueCap)).steps)
          fired.add(demandOf(step.technique))
      }
    expect([...DEMANDS].filter(demand => !fired.has(demand))).toEqual([])
  }, 120_000)
})
