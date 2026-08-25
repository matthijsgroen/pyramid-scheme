import { useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { SudokuBoard } from "@/mods/puzzle/app/sudoku/SudokuBoard"
import { SudokuPad } from "@/mods/puzzle/app/sudoku/SudokuPad"
import { SudokuRules } from "@/mods/puzzle/app/sudoku/SudokuRules"
import { buildSudokuHint } from "@/mods/puzzle/app/sudoku/sudokuHint"
import { useSudokuEntry } from "@/mods/puzzle/app/sudoku/useSudokuEntry"
import { skinFor } from "@/mods/puzzle/app/sudoku/skins"
import type { SudokuPuzzle as SudokuPuzzleData } from "@/mods/puzzle/game/sudoku/generateSudoku"
import {
  canUndoSudoku,
  clearSudokuCell,
  createSudokuState,
  sudokuNotes,
  sudokuValues,
  setSudokuValue,
  toggleSudokuNote,
  undoSudokuMove,
} from "@/mods/puzzle/game/sudoku/sudokuState"
import { isSudokuSolved, strandedNotes, sudokuConflicts } from "@/mods/puzzle/game/sudoku/sudokuStatus"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import type { Difficulty } from "@/data/difficultyLevels"

type Props = {
  puzzle: SudokuPuzzleData
  difficulty?: Difficulty
  /** The pool this room was drawn from — which place it is. */
  role?: string | string[]
  /** The ambience its site authored, or a skin named outright. */
  theme?: string
  onSolved: () => void
  onCancel: () => void
}

/** Which values already fill a square in every row, so the pad can dim what is spent. */
const exhaustedValues = (values: (number | undefined)[][], size: number): ReadonlySet<number> => {
  const counts = new Map<number, number>()
  for (const row of values)
    for (const value of row) if (value !== undefined) counts.set(value, (counts.get(value) ?? 0) + 1)
  return new Set([...counts].filter(([, count]) => count >= size).map(([value]) => value))
}

export const SudokuPuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const { size, solution, techniqueCap } = puzzle
  // Which place this room is. The board, the pad, the name, the goal, the rules and every hint
  // sentence are drawn from it — including what a value LOOKS like, which is this family's second face.
  const skin = skinFor(role, theme)
  const [state, setState] = useState(() => createSudokuState(puzzle))
  const { selected, pencil, selectCell, focusCell, togglePencil, clearSelection } = useSudokuEntry()

  const values = useMemo(() => sudokuValues(state), [state])
  /**
   * The value under the picked square, which every square holding it then washes to show.
   *
   * Derived here rather than held: what the player picked is already state, and "which value is that"
   * is a question about it. An empty square yields nothing to match, so picking one washes nothing.
   */
  const twinned = selected ? values[selected.row][selected.col] : undefined
  const conflicts = useMemo(() => sudokuConflicts(puzzle, values), [puzzle, values])
  const stranded = useMemo(() => strandedNotes(puzzle, values, sudokuNotes(state)), [puzzle, values, state])
  const hint = useMemo(
    () => buildSudokuHint(puzzle, sudokuValues(state), sudokuNotes(state), solution, techniqueCap),
    [puzzle, state, solution, techniqueCap]
  )

  /**
   * The board reads itself back before the shell is told: every square holding the 1 settles at once,
   * then every square holding the 2, to the width of the grid.
   *
   * **A tick is a VALUE, not a square**, and that is this family's own claim rather than a house style:
   * what the board asserts is that each of the six stands exactly once in every row, every column and
   * every chamber, so lighting all six homes of a value together is the rule showing itself.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved"
   * (`puzzle-screens.md` §3), so the run has to happen BEFORE that word is said — the family reports the
   * solve a beat later, and input is refused for that beat, or a value changed mid-run would land a
   * solve on a board that is no longer solved.
   *
   * **Read off `progress` rather than off `done`**, which is what keeps the reduced-motion case honest:
   * a skipped run reports done with progress still at 0, so the roll is simply never on and the board is
   * never anything but the answer the player filled in.
   */
  const finished = isSudokuSolved(puzzle, values)
  const celebration = useCelebration(finished, size)
  const counted = celebration.progress > 0 ? Math.round(celebration.progress * size) : undefined

  const enterValue = (value: number) => {
    if (!selected) return
    const { row, col } = selected
    setState(prev => (pencil ? toggleSudokuNote(prev, row, col, value) : setSudokuValue(prev, row, col, value)))
  }

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => {
        setState(createSudokuState(puzzle))
        clearSelection()
      }}
      hint={
        hint &&
        [
          // The value a reason is about reaches the sentence as the skin's own token, never as a
          // number: over a register, "4" would be the one thing on the screen that is not a sign.
          t(`sudoku.hint.${skin.name}.reason.${hint.key}`, {
            token: hint.params.value === undefined ? undefined : skin.token(hint.params.value),
          }),
          hint.move &&
            t(`sudoku.hint.${skin.name}.action.${hint.move.kind}`, {
              count: hint.move.count,
              token: skin.token(hint.move.value),
            }),
        ]
          .filter(Boolean)
          .join("\n")
      }
      idleMs={hintIdleDelay(difficulty)}
      // Reading a hint and then hunting for the square it means is the whole gap between advice and
      // acting on it, so asking for one aims the board and the pad at that square.
      onHintRevealed={() => hint && focusCell(hint.focus.row, hint.focus.col)}
      title={t(`sudoku.name.${skin.name}`)}
      goal={t(`sudoku.goal.${skin.name}`)}
      rules={<SudokuRules skin={skin.name} />}
    >
      {({ reportInput, hintVisible }) => (
        <>
          <SudokuBoard
            puzzle={puzzle}
            cells={state.cells}
            skin={skin}
            conflicts={conflicts}
            stranded={stranded}
            selected={selected}
            hatched={hintVisible ? hint?.cells : undefined}
            marked={hintVisible ? hint?.evidence : undefined}
            twinned={twinned}
            counted={counted}
            onSelect={(row, col) => {
              if (finished) return // the board is reading itself back; nothing may change under it
              reportInput()
              selectCell(row, col)
            }}
          />
          <SudokuPad
            size={size}
            skin={skin}
            pencil={pencil}
            canUndo={canUndoSudoku(state) && !finished}
            exhausted={exhaustedValues(values, size)}
            disabled={!selected || finished}
            onValue={value => {
              reportInput()
              enterValue(value)
            }}
            onErase={() => {
              if (finished || !selected) return
              reportInput()
              setState(prev => clearSudokuCell(prev, selected.row, selected.col))
            }}
            onTogglePencil={() => {
              reportInput()
              togglePencil()
            }}
            onUndo={() => {
              if (finished) return
              reportInput()
              setState(undoSudokuMove)
            }}
          />
        </>
      )}
    </PuzzleFamilyShell>
  )
}
