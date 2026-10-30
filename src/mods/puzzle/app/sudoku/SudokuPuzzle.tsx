import { useMemo, type FC } from "react"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { classifyItemMove, openItems, type Decision } from "@/mods/core/app/markMoveEffect"
import { useTranslation } from "react-i18next"
import { SudokuBoard } from "@/mods/puzzle/app/sudoku/SudokuBoard"
import { SudokuPad } from "@/mods/puzzle/app/sudoku/SudokuPad"
import { SudokuRules } from "@/mods/puzzle/app/sudoku/SudokuRules"
import { buildSudokuHint } from "@/mods/puzzle/app/sudoku/sudokuHint"
import { useSudokuEntry } from "@/mods/puzzle/app/sudoku/useSudokuEntry"
import { skinFor } from "@/mods/puzzle/app/sudoku/skins"
import type { SudokuPuzzle as SudokuPuzzleData } from "@/mods/puzzle/game/sudoku/generateSudoku"
import type { SudokuCell } from "@/mods/puzzle/game/sudoku/sudokuState"
import {
  canUndoSudoku,
  clearSudokuCell,
  createSudokuState,
  sudokuNotes,
  sudokuValues,
  setSudokuValue,
  toggleSudokuNote,
  type SudokuState,
  undoSudokuMove,
} from "@/mods/puzzle/game/sudoku/sudokuState"
import { isSudokuSolved, strandedNotes, sudokuConflicts } from "@/mods/puzzle/game/sudoku/sudokuStatus"
import { boxCount, sudokuCellKey } from "@/mods/puzzle/game/sudoku/techniques"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay, type InputEffect } from "@/mods/core/app/useHintAvailability"
import type { Difficulty } from "@/data/difficultyLevels"

/**
 * What a hint asks of one square. A place wants the value written; a rule out wants the named notes gone, and
 * a note rubbed out on the way follows it, but one added or any value written does not.
 */
const decisionFor = (kind: "place" | "ruleOut", targets: readonly number[]): Decision<SudokuCell> =>
  kind === "place"
    ? {
        holds: cell => cell.value === targets[0],
        follows: (_before, after) => after.value === targets[0],
      }
    : {
        holds: cell => !targets.some(value => cell.notes.includes(value)),
        follows: (before, after) =>
          before.value === after.value &&
          after.notes.every(value => before.notes.includes(value)) &&
          before.notes.filter(value => !after.notes.includes(value)).every(value => targets.includes(value)),
      }

const cellAt = (cells: SudokuCell[][], key: string): SudokuCell => {
  const [row, col] = key.split(",").map(Number)
  return cells[row][col]
}

type Props = {
  puzzle: SudokuPuzzleData
  difficulty?: Difficulty
  /** The pool this room was drawn from — which place it is. */
  role?: string | string[]
  /** The ambience its site authored, or a skin named outright. */
  theme?: string
  /** Which room this is, so an undressed one still draws a face of its own (faceFor.ts). */
  room?: string
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

export const SudokuPuzzle: FC<Props> = ({ puzzle, difficulty, role, theme, room, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const { size, solution, techniqueCap } = puzzle
  // Which place this room is. The board, the pad, the name, the goal, the rules and every hint
  // sentence are drawn from it — including what a value LOOKS like, which is this family's second face.
  const skin = skinFor(role, theme, 0, room)
  const [state, setState] = usePuzzleState(() => createSudokuState(puzzle), puzzle)
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
  // Derived on every change: whether there is a hint at all is what shows the button. What the player is
  // shown is the one from the moment they asked, held until a move ends it, so a hint that names several
  // squares keeps naming the same ones while they are carried out.
  const available = useMemo(
    () => buildSudokuHint(puzzle, sudokuValues(state), sudokuNotes(state), solution, techniqueCap),
    [puzzle, state, solution, techniqueCap]
  )
  const { hint, freeze, drop } = useFrozenHint(() => available)
  const decisions = new Map(
    hint?.move && hint.targets
      ? [...hint.targets].map(([cell, targets]) => [cell, decisionFor(hint.move!.kind, targets)] as const)
      : []
  )
  const open = hint ? openItems(hint.cells, decisions, cell => cellAt(state.cells, cell)) : undefined

  /**
   * The board finishes itself before the shell is told, in whichever way its face finishes: a chamber
   * wall reads its values back, every square holding the 1 settling at once and then every square
   * holding the 2; a register takes its chambers up as scrolls, one after the next.
   *
   * **A tick is never a SQUARE**, and that is this family's own claim rather than a house style: what
   * the board asserts is that each of the six stands exactly once in every row, every column and every
   * chamber. Lighting all six homes of a value together says that from the value's side, and rolling up
   * a chamber that holds all six says it from the chamber's — one rule, and each face says the half its
   * own ground can say (design doc §9.1).
   *
   * The shell freezes the board and starts its banner the moment it hears "solved"
   * (`puzzle-screens.md` §3), so the run has to happen BEFORE that word is said — the family reports the
   * solve a beat later, and input is refused for that beat, or a value changed mid-run would land a
   * solve on a board that is no longer solved.
   *
   * **Read off `progress` rather than off `done`**, which is what keeps the reduced-motion case honest:
   * a skipped run reports done with progress still at 0, so neither run is ever on and the board is
   * never anything but the answer the player filled in.
   */
  const finished = isSudokuSolved(puzzle, values)
  // What the run COUNTS is the face's, not the family's: a register is finished by being rolled up and
  // put away, a chamber wall by catching the light. Both counts land on the same number here — a 6x6 has
  // six values and six chambers — but they are asked for separately, because they are different claims
  // and a grid cut another way would separate them.
  const ticks = skin.scroll ? boxCount(puzzle) : size
  // A roll asks for the whole second `useCelebration` allows, where a value only needs its flare: an
  // edge has to be slow enough to be read as one crossing (design doc §9.1).
  const celebration = useCelebration(finished, ticks, skin.scroll ? 1000 : undefined)
  const reached = celebration.progress > 0 ? Math.round(celebration.progress * ticks) : undefined
  const counted = skin.scroll ? undefined : reached
  const rolled = skin.scroll ? reached : undefined

  /** Tells the shell what a move did to the hint on screen: a no-op only looks, a hinted step follows or completes it. */
  const effectOf = (next: SudokuState, row: number, col: number) => {
    const cell = sudokuCellKey(row, col)
    const was = state.cells[row][col]
    const is = next.cells[row][col]
    const changed = was.value !== is.value || was.notes.join() !== is.notes.join()
    if (!hint) return changed ? ("move" as const) : ("look" as const)
    return classifyItemMove(
      hint.cells,
      decisions,
      changed ? [cell] : [],
      item => cellAt(state.cells, item),
      item => cellAt(next.cells, item)
    )
  }

  const enterValue = (value: number, reportInput: (effect: InputEffect) => void) => {
    if (!selected) return
    const { row, col } = selected
    const next = pencil ? toggleSudokuNote(state, row, col, value) : setSudokuValue(state, row, col, value)
    reportInput(effectOf(next, row, col))
    setState(next)
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
      undo={{ onPress: () => setState(undoSudokuMove), enabled: canUndoSudoku(state) && !finished }}
      hint={
        available &&
        (() =>
          hint &&
          [
            // The value a reason is about reaches the sentence as the skin's own token, never as a
            // number: over a register, "4" would be the one thing on the screen that is not a sign. It is
            // the same character the squares show, which is what the bundled face guarantees.
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
            .join("\n"))
      }
      idleMs={hintIdleDelay(difficulty)}
      // Reading a hint and then hunting for the square it means is the whole gap between advice and
      // acting on it, so asking for one aims the board and the pad at that square.
      onHintRevealed={() => {
        freeze()
        if (available) focusCell(available.focus.row, available.focus.col)
      }}
      onHintHidden={drop}
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
            hatched={hintVisible ? open : undefined}
            marked={hintVisible ? hint?.evidence : undefined}
            twinned={twinned}
            counted={counted}
            rolled={rolled}
            onSelect={(row, col) => {
              if (finished) return // the board is reading itself back; nothing may change under it
              reportInput("look")
              selectCell(row, col)
            }}
          />
          <SudokuPad
            size={size}
            skin={skin}
            pencil={pencil}
            exhausted={exhaustedValues(values, size)}
            disabled={!selected || finished}
            onValue={value => enterValue(value, reportInput)}
            onErase={() => {
              if (finished || !selected) return
              const next = clearSudokuCell(state, selected.row, selected.col)
              reportInput(effectOf(next, selected.row, selected.col))
              setState(next)
            }}
            onTogglePencil={() => {
              reportInput("look")
              togglePencil()
            }}
          />
        </>
      )}
    </PuzzleFamilyShell>
  )
}
