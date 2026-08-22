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
      solved={isFutoshikiSolved(puzzle, values)}
      onReset={() => {
        setState(createFutoshikiState(puzzle))
        clearSelection()
      }}
      hint={hint && t(`futoshiki.hint.${hint.key}`, hint.params)}
      idleMs={hintIdleDelay(difficulty)}
      // Reading a hint and then hunting for the square it means is the whole gap between advice and
      // acting on it, so asking for one aims the board and the pad at that square.
      onHintRevealed={() => hint && focusCell(hint.focus.row, hint.focus.col)}
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
            onSelect={(row, col) => {
              reportInput()
              selectCell(row, col)
            }}
          />
          <FutoshikiPad
            size={size}
            pencil={pencil}
            canUndo={canUndoFutoshiki(state)}
            exhausted={exhaustedNumbers(values, size)}
            disabled={!selected}
            onNumber={value => {
              reportInput()
              enterNumber(value)
            }}
            onErase={() => {
              reportInput()
              eraseCell()
            }}
            onTogglePencil={() => {
              reportInput()
              togglePencil()
            }}
            onUndo={() => {
              reportInput()
              setState(undoFutoshikiMove)
            }}
          />
        </>
      )}
    </PuzzleFamilyShell>
  )
}
