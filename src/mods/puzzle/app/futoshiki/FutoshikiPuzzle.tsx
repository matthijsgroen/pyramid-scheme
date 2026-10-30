import { useMemo, type FC } from "react"
import { usePuzzleState } from "@/mods/core/app/puzzleState"
import { useFrozenHint } from "@/mods/core/app/useFrozenHint"
import { useTranslation } from "react-i18next"
import { FutoshikiBoard } from "@/mods/puzzle/app/futoshiki/FutoshikiBoard"
import { FutoshikiPad } from "@/mods/puzzle/app/futoshiki/FutoshikiPad"
import { FutoshikiRules } from "@/mods/puzzle/app/futoshiki/FutoshikiRules"
import { buildFutoshikiHint } from "@/mods/puzzle/app/futoshiki/futoshikiHint"
import { useFutoshikiEntry } from "@/mods/puzzle/app/futoshiki/useFutoshikiEntry"
import type { FutoshikiPuzzle as FutoshikiPuzzleData } from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import {
  type FutoshikiState,
  canUndoFutoshiki,
  clearFutoshikiCell,
  createFutoshikiState,
  futoshikiNotes,
  futoshikiValues,
  setFutoshikiValue,
  toggleFutoshikiNote,
  undoFutoshikiMove,
} from "@/mods/puzzle/game/futoshiki/futoshikiState"
import { futoshikiConflicts, isFutoshikiSolved, strandedNotes } from "@/mods/puzzle/game/futoshiki/futoshikiStatus"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay, type InputEffect } from "@/mods/core/app/useHintAvailability"
import type { Difficulty } from "@/data/difficultyLevels"

type Props = {
  puzzle: FutoshikiPuzzleData
  difficulty?: Difficulty
  onSolved: () => void
  onCancel: () => void
}

/** Which numbers already fill a square in every row, so the pad can dim what is spent. */
const exhaustedNumbers = (values: (number | undefined)[][], size: number): ReadonlySet<number> => {
  const counts = new Map<number, number>()
  for (const row of values)
    for (const value of row) if (value !== undefined) counts.set(value, (counts.get(value) ?? 0) + 1)
  return new Set([...counts].filter(([, count]) => count >= size).map(([value]) => value))
}

export const FutoshikiPuzzle: FC<Props> = ({ puzzle, difficulty, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const { size, solution, techniqueCap } = puzzle
  const [state, setState] = usePuzzleState(() => createFutoshikiState(puzzle), puzzle)
  const { selected, pencil, selectCell, focusCell, togglePencil, clearSelection } = useFutoshikiEntry()

  const values = useMemo(() => futoshikiValues(state), [state])
  const conflicts = useMemo(() => futoshikiConflicts(puzzle, values), [puzzle, values])
  const stranded = useMemo(() => strandedNotes(puzzle, values, futoshikiNotes(state)), [puzzle, values, state])
  // Derived on every change: whether there is a hint at all is what shows the button. What the player is
  // shown is the one from the moment they asked, held until a move ends it. It decides nothing checkable,
  // so every change to the board ends it and only looking keeps it.
  const available = useMemo(
    () => buildFutoshikiHint(puzzle, futoshikiValues(state), futoshikiNotes(state), solution, techniqueCap),
    [puzzle, state, solution, techniqueCap]
  )
  const { hint, freeze, drop } = useFrozenHint(() => available)

  /**
   * The board finishes itself before the shell is told, by COUNTING UP: the whole grid rolls to 1, the squares
   * that really are 1 swell and keep it, the rest roll on to 2, and so on to the width of the grid.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved", so the celebration has to
   * happen BEFORE that word is said (`puzzle-screens.md` §3) — the family reports the solve a beat later, and
   * input is refused for that beat, or a number changed mid-run would land a solve on a board that is no
   * longer solved.
   *
   * **A tick is a NUMBER, not a square**, and that is the family rather than a house style: what this board
   * is about is order — every chevron is a claim about which of two numbers is bigger — so a count from 1 to n
   * is the board reading its own answer back, in the order the signs argued for. A sweep across the grid would
   * say nothing about order, and eclipse already owns that motion.
   *
   * **Read off `progress` rather than off `done`**, which is what keeps the reduced-motion case honest: a
   * skipped run reports done with progress still at 0, so the count is simply never on and the board is never
   * anything but the answer the player filled in.
   */
  const finished = isFutoshikiSolved(puzzle, values)
  const celebration = useCelebration(finished, size)
  const counted = celebration.progress > 0 ? Math.round(celebration.progress * size) : undefined

  // The hint decides nothing checkable, so a square that changes ends it and one left as it was is a look.
  // The board shares every square a move leaves alone, so an unchanged square is the same object.
  const apply = (next: FutoshikiState, row: number, col: number, reportInput: (effect: InputEffect) => void) => {
    reportInput(next.cells[row][col] === state.cells[row][col] ? "look" : "move")
    setState(next)
  }

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => {
        setState(createFutoshikiState(puzzle))
        clearSelection()
      }}
      undo={{ onPress: () => setState(undoFutoshikiMove), enabled: canUndoFutoshiki(state) && !finished }}
      hint={available && (() => hint && t(`futoshiki.hint.${hint.key}`, hint.params))}
      idleMs={hintIdleDelay(difficulty)}
      // Reading a hint and then hunting for the square it means is the whole gap between advice and
      // acting on it, so asking for one aims the board and the pad at that square.
      onHintRevealed={() => {
        freeze()
        if (available) focusCell(available.focus.row, available.focus.col)
      }}
      onHintHidden={drop}
      title={t("futoshiki.name")}
      goal={t("futoshiki.goal")}
      rules={<FutoshikiRules />}
    >
      {({ reportInput, hintVisible }) => (
        <>
          <FutoshikiBoard
            puzzle={puzzle}
            cells={state.cells}
            conflicts={conflicts}
            stranded={stranded}
            selected={selected}
            highlighted={hintVisible ? hint?.cells : undefined}
            litSigns={hintVisible ? hint?.constraints : undefined}
            counted={counted}
            onSelect={(row, col) => {
              if (finished) return // the board is finishing; nothing may change under the celebration
              reportInput("look")
              selectCell(row, col)
            }}
          />
          <FutoshikiPad
            size={size}
            pencil={pencil}
            exhausted={exhaustedNumbers(values, size)}
            disabled={!selected || finished}
            onNumber={value => {
              if (!selected) return
              const { row, col } = selected
              const next = pencil
                ? toggleFutoshikiNote(state, row, col, value)
                : setFutoshikiValue(state, row, col, value)
              apply(next, row, col, reportInput)
            }}
            onErase={() => {
              if (finished || !selected) return
              apply(clearFutoshikiCell(state, selected.row, selected.col), selected.row, selected.col, reportInput)
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
