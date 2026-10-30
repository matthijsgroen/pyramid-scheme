import { describe, expect, it } from "vitest"
import { buildSudokuHint } from "./sudokuHint"
import { generateSudoku } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SUDOKU_CONFIG } from "@/mods/puzzle/game/sudoku/sudokuConfig"
import { sudokuCellKey, type SudokuNotes, type SudokuValues } from "@/mods/puzzle/game/sudoku/techniques"

const board = generateSudoku(1, SUDOKU_CONFIG.expert)

const start = (): SudokuValues => board.givens.map(row => [...row])
const noNotes = (): SudokuNotes => Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => []))

const anEmptySquare = () => {
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 6; col++) if (board.givens[row][col] === undefined) return { row, col }
  throw new Error("a board with no square to fill in")
}

describe("the next thing to say to the player", () => {
  it("names the reason, the squares it settles and the move it asks for", () => {
    const hint = buildSudokuHint(board, start(), noNotes(), board.solution, board.techniqueCap)
    expect(hint?.key).toBeTruthy()
    expect(hint?.cells.size).toBeGreaterThan(0)
    expect(hint?.move).toBeDefined()
    // The move settles what the board hatched, so the sentence and the marking cannot disagree
    // (`puzzle-screens.md` §4.2).
    expect(hint?.move?.count).toBe(hint?.cells.size)
    // And the square the cursor is sent to is one of them, so asking for a hint aims the pad at what
    // the sentence is about rather than leaving the player to find it.
    expect(hint?.cells.has(sudokuCellKey(hint!.focus.row, hint!.focus.col))).toBe(true)
  })

  it("puts a wrong value ahead of every reason, because the reasons that follow it are advice to a dead end", () => {
    const { row, col } = anEmptySquare()
    const values = start()
    values[row][col] = (board.solution[row][col] % 6) + 1
    const hint = buildSudokuHint(board, values, noNotes(), board.solution, board.techniqueCap)
    expect(hint?.key).toBe("mistake.value")
    expect(hint?.cells).toEqual(new Set([sudokuCellKey(row, col)]))
    // A mistake hint asks for nothing: the way out of a wrong mark is the player's to find, and
    // naming it would be naming the answer (`puzzle-screens.md` §4.1).
    expect(hint?.move).toBeUndefined()
  })

  it("catches notes that have ruled out the value that belongs there", () => {
    const { row, col } = anEmptySquare()
    const notes = noNotes()
    notes[row][col] = [(board.solution[row][col] % 6) + 1]
    expect(buildSudokuHint(board, start(), notes, board.solution, board.techniqueCap)?.key).toBe("mistake.note")
  })

  it("reads the player's own notes, so following the advice is what moves the hint on", () => {
    const { row, col } = anEmptySquare()
    const notes = noNotes()
    notes[row][col] = [board.solution[row][col]]
    // Pencilled down to one value, that square is now the cheapest thing on the board.
    const hint = buildSudokuHint(board, start(), notes, board.solution, board.techniqueCap)
    expect(hint).toMatchObject({ key: "nakedSingle", focus: { row, col } })
    expect(hint?.move).toEqual({ kind: "place", value: board.solution[row][col], count: 1 })
  })

  it("says nothing about a board that is already finished", () => {
    expect(buildSudokuHint(board, board.solution, noNotes(), board.solution, board.techniqueCap)).toBeUndefined()
  })

  it("stays inside the ladder the board was accepted under", () => {
    // A starter board is explained with starter reasoning: the hint never reaches for a rung the tier
    // was never built to need.
    const gentle = generateSudoku(1, SUDOKU_CONFIG.starter)
    const hint = buildSudokuHint(gentle, gentle.givens, noNotes(), gentle.solution, gentle.techniqueCap)
    expect(hint?.key).toBe("nakedSingle")
  })

  describe("what each square is asked for", () => {
    it("maps the placed square to the value to write", () => {
      const { row, col } = anEmptySquare()
      const notes = noNotes()
      notes[row][col] = [board.solution[row][col]]
      const hint = buildSudokuHint(board, start(), notes, board.solution, board.techniqueCap)
      expect(hint?.targets).toEqual(new Map([[sudokuCellKey(row, col), [board.solution[row][col]]]]))
    })

    it("maps every square a rule out settles to the notes to rub out of it", () => {
      // Walk a board with the solution's own values, collecting every rule out met on the way.
      const ruleOutsOf = (seed: number) => {
        const puzzle = generateSudoku(seed, SUDOKU_CONFIG.wizard)
        const values = puzzle.givens.map(row => [...row])
        const found: NonNullable<ReturnType<typeof buildSudokuHint>>[] = []
        for (let step = 0; step < 40; step++) {
          const hint = buildSudokuHint(puzzle, values, noNotes(), puzzle.solution, puzzle.techniqueCap)
          if (!hint?.move) break
          if (hint.move.kind === "place") {
            values[hint.focus.row][hint.focus.col] = hint.move.value
            continue
          }
          found.push(hint)
          // Settle some other empty square from the solution so the walk moves on.
          const open = values.flatMap((row, r) =>
            row.flatMap((v, c) => (v === undefined && !hint.cells.has(sudokuCellKey(r, c)) ? [{ r, c }] : []))
          )
          if (!open.length) break
          values[open[0].r][open[0].c] = puzzle.solution[open[0].r][open[0].c]
        }
        return found
      }
      const ruleOuts = [1, 2, 3, 4, 5, 6, 7, 8].flatMap(ruleOutsOf)
      expect(ruleOuts.length, "no wizard board reaches a rule out").toBeGreaterThan(0)
      for (const hint of ruleOuts) {
        expect(new Set(hint.targets?.keys())).toEqual(hint.cells)
        for (const values of hint.targets!.values()) expect(values).toEqual([hint.params.value])
        expect(hint.targets!.get(sudokuCellKey(hint.focus.row, hint.focus.col))).toContain(hint.move?.value)
      }
      expect(
        ruleOuts.some(hint => hint.cells.size > 1),
        "no board rules out in several squares"
      ).toBe(true)
    }, 60000)

    it("has no targets for a mistake", () => {
      const { row, col } = anEmptySquare()
      const values = start()
      values[row][col] = (board.solution[row][col] % 6) + 1
      expect(buildSudokuHint(board, values, noNotes(), board.solution, board.techniqueCap)?.targets).toBeUndefined()
    })
  })
})
