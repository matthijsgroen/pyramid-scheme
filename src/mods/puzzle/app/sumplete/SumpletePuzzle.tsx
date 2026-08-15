import { useCallback, useMemo, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { SumpleteBoard } from "@/mods/puzzle/app/sumplete/SumpleteBoard"
import { SumpleteRules } from "@/mods/puzzle/app/sumplete/SumpleteRules"
import { buildSumpleteHint } from "@/mods/puzzle/app/sumplete/sumpleteHint"
import { computeColLines, computeRowLines, isSumpleteSolved } from "@/mods/puzzle/game/sumplete/sumpleteStatus"
import { createSumpleteState, toggleSumpleteCell } from "@/mods/puzzle/game/sumplete/sumpleteState"
import type { SumpleteGrid } from "@/mods/puzzle/game/sumplete/generateSumplete"
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

  const hint = useMemo(
    () => buildSumpleteHint({ grid, rowTargets, colTargets }, state.cells, solution, techniqueCap),
    [grid, rowTargets, colTargets, state.cells, solution, techniqueCap]
  )

  return (
    <PuzzleFamilyShell
      onSolved={onSolved}
      onCancel={onCancel}
      solved={isSumpleteSolved(rows, cols)}
      onReset={() => setState(createSumpleteState(grid.length))}
      hint={hint && t(`sumplete.hint.${hint.key}`, hint.params)}
      idleMs={hintIdleDelay(difficulty)}
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
          onToggle={(row, col) => {
            reportInput()
            toggle(row, col)
          }}
        />
      )}
    </PuzzleFamilyShell>
  )
}
