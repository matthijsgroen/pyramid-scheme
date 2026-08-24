import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { FutoshikiBoard } from "@/mods/puzzle/app/futoshiki/FutoshikiBoard"
import { FutoshikiPad } from "@/mods/puzzle/app/futoshiki/FutoshikiPad"
import { FutoshikiRules } from "@/mods/puzzle/app/futoshiki/FutoshikiRules"
import { buildFutoshikiHint } from "@/mods/puzzle/app/futoshiki/futoshikiHint"
import { useFutoshikiEntry } from "@/mods/puzzle/app/futoshiki/useFutoshikiEntry"
import type { FutoshikiPuzzle as FutoshikiPuzzleData } from "@/mods/puzzle/game/futoshiki/generateFutoshiki"
import {
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
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
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
  const [state, setState] = useState(() => createFutoshikiState(puzzle))
  const { selected, pencil, selectCell, focusCell, togglePencil, clearSelection } = useFutoshikiEntry()

  const values = useMemo(() => futoshikiValues(state), [state])
  const conflicts = useMemo(() => futoshikiConflicts(puzzle, values), [puzzle, values])
  const stranded = useMemo(() => strandedNotes(puzzle, values, futoshikiNotes(state)), [puzzle, values, state])
  const hint = useMemo(
    () => buildFutoshikiHint(puzzle, futoshikiValues(state), futoshikiNotes(state), solution, techniqueCap),
    [puzzle, state, solution, techniqueCap]
  )

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

  const enterNumber = useCallback(
    (value: number) => {
      if (!selected) return
      const { row, col } = selected
      setState(prev => (pencil ? toggleFutoshikiNote(prev, row, col, value) : setFutoshikiValue(prev, row, col, value)))
    },
    [selected, pencil]
  )

  const eraseCell = useCallback(() => {
    if (selected) setState(prev => clearFutoshikiCell(prev, selected.row, selected.col))
  }, [selected])

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => {
        setState(createFutoshikiState(puzzle))
        clearSelection()
      }}
      hint={hint && t(`futoshiki.hint.${hint.key}`, hint.params)}
      idleMs={hintIdleDelay(difficulty)}
      // Reading a hint and then hunting for the square it means is the whole gap between advice and
      // acting on it, so asking for one aims the board and the pad at that square.
      onHintRevealed={() => hint && focusCell(hint.focus.row, hint.focus.col)}
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
              reportInput()
              selectCell(row, col)
            }}
          />
          <FutoshikiPad
            size={size}
            pencil={pencil}
            canUndo={canUndoFutoshiki(state) && !finished}
            exhausted={exhaustedNumbers(values, size)}
            disabled={!selected || finished}
            onNumber={value => {
              reportInput()
              enterNumber(value)
            }}
            onErase={() => {
              if (finished) return
              reportInput()
              eraseCell()
            }}
            onTogglePencil={() => {
              reportInput()
              togglePencil()
            }}
            onUndo={() => {
              if (finished) return
              reportInput()
              setState(undoFutoshikiMove)
            }}
          />
        </>
      )}
    </PuzzleFamilyShell>
  )
}
