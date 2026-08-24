import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { SumpleteBoard } from "@/mods/puzzle/app/sumplete/SumpleteBoard"
import { SumpleteRules } from "@/mods/puzzle/app/sumplete/SumpleteRules"
import { buildSumpleteHint } from "@/mods/puzzle/app/sumplete/sumpleteHint"
import { computeColLines, computeRowLines, isSumpleteSolved } from "@/mods/puzzle/game/sumplete/sumpleteStatus"
import { createSumpleteState, toggleSumpleteCell } from "@/mods/puzzle/game/sumplete/sumpleteState"
import type { SumpleteGrid } from "@/mods/puzzle/game/sumplete/generateSumplete"
import { useCelebration } from "@/mods/core/app/useCelebration"
import { PuzzleFamilyShell } from "@/mods/core/app/PuzzleFamilyShell"
import { hintIdleDelay } from "@/mods/core/app/useHintAvailability"
import type { Difficulty } from "@/data/difficultyLevels"

type Props = {
  puzzle: SumpleteGrid
  difficulty?: Difficulty
  onSolved: () => void
  onCancel: () => void
}

export const SumpletePuzzle: FC<Props> = ({ puzzle, difficulty, onSolved, onCancel }) => {
  const { t } = useTranslation("common")
  const { grid, rowTargets, colTargets, solution, techniqueCap } = puzzle
  const [state, setState] = useState(() => createSumpleteState(grid.length))

  const toggle = useCallback((row: number, col: number) => setState(prev => toggleSumpleteCell(prev, row, col)), [])

  const rows = computeRowLines(grid, state.cells, rowTargets)
  const cols = computeColLines(grid, state.cells, colTargets)

  /**
   * The board finishes itself before the shell is told, by checking its own sums off: the row targets flare
   * top to bottom, then the column targets left to right.
   *
   * The shell freezes the board and starts its banner the moment it hears "solved", so the celebration has to
   * happen BEFORE that word is said (`puzzle-screens.md` §3) — the family reports the solve a beat later, and
   * input is refused for that beat, or a number toggled mid-run would land a solve on a board that is no
   * longer solved.
   *
   * **A tick is a LINE, and what flares is the TARGET.** The targets are what this board wins by — every row
   * and every column hitting its number — so a run down them is the board checking its own claim, in the two
   * directions the claim is made in. Flaring the numbers instead would celebrate the arithmetic rather than
   * the result, and the struck numbers are as much of the answer as the kept ones.
   *
   * Read off `progress` rather than `done`, so a run skipped for reduced motion never starts.
   */
  const finished = isSumpleteSolved(rows, cols)
  const lines = grid.length * 2
  const celebration = useCelebration(finished, lines)
  const checked = celebration.progress > 0 ? Math.round(celebration.progress * lines) : undefined

  const hint = useMemo(
    () => buildSumpleteHint({ grid, rowTargets, colTargets }, state.cells, solution, techniqueCap),
    [grid, rowTargets, colTargets, state.cells, solution, techniqueCap]
  )

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={celebration.done}
      onReset={() => setState(createSumpleteState(grid.length))}
      // Two lines: the reason, then the move it asks for (`puzzle-screens.md` §4).
      hint={
        hint &&
        [
          t(`sumplete.hint.${hint.key}`, hint.params),
          hint.action && t(`sumplete.hint.action.${hint.action.key}`, { count: hint.action.count }),
        ]
          .filter(Boolean)
          .join("\n")
      }
      idleMs={hintIdleDelay(difficulty)}
      title={t("sumplete.name")}
      goal={t("sumplete.goal")}
      rules={<SumpleteRules />}
    >
      {({ reportInput, hintVisible }) => (
        <SumpleteBoard
          grid={grid}
          cells={state.cells}
          rows={rows}
          cols={cols}
          highlighted={hintVisible ? hint?.cells : undefined}
          litLine={hintVisible ? hint?.line : undefined}
          checked={checked}
          onToggle={(row, col) => {
            if (finished) return // the board is finishing; nothing may change under the celebration
            reportInput()
            toggle(row, col)
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
