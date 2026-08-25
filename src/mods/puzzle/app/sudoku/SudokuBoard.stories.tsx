import type { Meta, StoryObj } from "@storybook/react-vite"
import { generateSudoku } from "@/mods/puzzle/game/sudoku/generateSudoku"
import { SUDOKU_CONFIG } from "@/mods/puzzle/game/sudoku/sudokuConfig"
import {
  createSudokuState,
  setSudokuValue,
  sudokuNotes,
  sudokuValues,
  toggleSudokuNote,
} from "@/mods/puzzle/game/sudoku/sudokuState"
import { strandedNotes, sudokuConflicts } from "@/mods/puzzle/game/sudoku/sudokuStatus"
import { buildSudokuHint } from "./sudokuHint"
import { SudokuBoard } from "./SudokuBoard"
import { skinFor } from "./skins"

const meta = {
  title: "Puzzle/SudokuBoard",
  component: SudokuBoard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
  // The board sizes off its container and the viewport, the way it has to on a phone
  // (`puzzle-screens.md` §1) — so a story that gives it no container shows a thumbnail of one.
  decorators: [
    Story => (
      <div className="w-sm max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SudokuBoard>

export default meta
type Story = StoryObj<typeof meta>

const carved = skinFor(undefined, undefined)
const register = skinFor("scribe", undefined)

const starter = generateSudoku(1, SUDOKU_CONFIG.starter)
const wizard = generateSudoku(4, SUDOKU_CONFIG.wizard)

const untouched = (puzzle: typeof starter, skin: typeof carved) => {
  const state = createSudokuState(puzzle)
  return {
    puzzle,
    skin,
    cells: state.cells,
    conflicts: sudokuConflicts(puzzle, sudokuValues(state)),
    onSelect: () => {},
  }
}

/** Figures cut into a chamber wall — the face every room wears unless its site asked for another. */
export const Starter: Story = { args: untouched(starter, carved) }

export const Wizard: Story = { args: untouched(wizard, carved) }

/** The same board as a scribe's register: six signs inked on papyrus, the puzzle's own in red. */
export const Papyrus: Story = { args: untouched(starter, register) }

export const PapyrusWizard: Story = { args: untouched(wizard, register) }

/**
 * Pencilled options in some squares, a value written into another, and one square picked. A value
 * written elsewhere in the group strikes the pencilled copy of it through in red rather than rubbing
 * it out — correcting that value would bring the note back.
 */
const pencilled = (puzzle: typeof starter, skin: typeof carved) => {
  const open = puzzle.givens.flatMap((row, rowIndex) =>
    row.flatMap((value, colIndex) => (value === undefined ? [{ row: rowIndex, col: colIndex }] : []))
  )
  let state = createSudokuState(puzzle)
  for (const value of [1, 3, 5]) state = toggleSudokuNote(state, open[0].row, open[0].col, value)
  for (const value of [2, 4]) state = toggleSudokuNote(state, open[1].row, open[1].col, value)
  state = setSudokuValue(state, open[2].row, open[2].col, puzzle.solution[open[2].row][open[2].col])
  const values = sudokuValues(state)
  return {
    puzzle,
    skin,
    cells: state.cells,
    conflicts: sudokuConflicts(puzzle, values),
    stranded: strandedNotes(puzzle, values, sudokuNotes(state)),
    selected: open[1],
    onSelect: () => {},
  }
}

export const WithNotes: Story = { args: pencilled(starter, carved) }

export const PapyrusWithNotes: Story = { args: pencilled(starter, register) }

/**
 * A hint on screen: the squares it SETTLES are hatched, the squares it argues FROM are ringed. The two
 * never look the same, or "this square" is a guess between six of them (`puzzle-screens.md` §4.2).
 */
const hinted = (puzzle: typeof starter, skin: typeof carved) => {
  const state = createSudokuState(puzzle)
  const hint = buildSudokuHint(puzzle, sudokuValues(state), sudokuNotes(state), puzzle.solution, puzzle.techniqueCap)
  return {
    ...untouched(puzzle, skin),
    hatched: hint?.cells,
    marked: hint?.evidence,
    selected: hint?.focus,
  }
}

export const WithHint: Story = { args: hinted(starter, carved) }

export const PapyrusWithHint: Story = { args: hinted(starter, register) }

/** One value standing twice in a row, which the board says without any words. */
const clashing = (puzzle: typeof starter, skin: typeof carved) => {
  const open = puzzle.givens.flatMap((row, rowIndex) =>
    row.flatMap((value, colIndex) => (value === undefined ? [{ row: rowIndex, col: colIndex }] : []))
  )
  const first = open[0]
  const second = open.find(cell => cell.row === first.row && cell.col !== first.col) ?? open[1]
  const repeated = puzzle.solution[first.row][first.col]
  let state = createSudokuState(puzzle)
  state = setSudokuValue(state, first.row, first.col, repeated)
  state = setSudokuValue(state, second.row, second.col, repeated)
  const values = sudokuValues(state)
  return { puzzle, skin, cells: state.cells, conflicts: sudokuConflicts(puzzle, values), onSelect: () => {} }
}

export const WithConflict: Story = { args: clashing(starter, carved) }

export const PapyrusWithConflict: Story = { args: clashing(starter, register) }
