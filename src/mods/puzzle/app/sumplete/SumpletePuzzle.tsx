import { useCallback, useEffect, useState, type FC } from "react"
import { SumpleteBoard } from "@/mods/puzzle/app/sumplete/SumpleteBoard"
import { computeColStatuses, computeRowStatuses, isSumpleteSolved } from "@/mods/puzzle/game/sumplete/sumpleteStatus"
import { createSumpleteState, toggleSumpleteCell } from "@/mods/puzzle/game/sumplete/sumpleteState"

type Props = {
  grid: number[][]
  rowTargets: number[]
  colTargets: number[]
  onSolved: () => void
}

export const SumpletePuzzle: FC<Props> = ({ grid, rowTargets, colTargets, onSolved }) => {
  const n = grid.length
  const [state, setState] = useState(() => createSumpleteState(n))

  const toggle = useCallback((r: number, c: number) => setState(prev => toggleSumpleteCell(prev, r, c)), [])

  const rowStatuses = computeRowStatuses(grid, state.cells, rowTargets)
  const colStatuses = computeColStatuses(grid, state.cells, colTargets)
  const solved = isSumpleteSolved(rowStatuses, colStatuses)

  useEffect(() => {
    if (solved) onSolved()
  }, [solved, onSolved])

  return (
    <SumpleteBoard
      grid={grid}
      rowTargets={rowTargets}
      colTargets={colTargets}
      cells={state.cells}
      rowStatuses={rowStatuses}
      colStatuses={colStatuses}
      onToggle={toggle}
    />
  )
}
