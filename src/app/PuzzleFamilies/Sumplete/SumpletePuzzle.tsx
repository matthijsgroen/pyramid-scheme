import { useCallback, useEffect, useState, type FC } from "react"
import { SumpleteBoard } from "@/ui/organisms/SumpleteBoard"
import { computeColStatuses, computeRowStatuses, isSumpleteSolved, type SumpleteCellState } from "@/game/sumpleteStatus"

type Props = {
  grid: number[][]
  rowTargets: number[]
  colTargets: number[]
  onSolved: () => void
}

const cycle = (s: SumpleteCellState): SumpleteCellState =>
  s === "unknown" ? "excluded" : s === "excluded" ? "included" : "unknown"

export const SumpletePuzzle: FC<Props> = ({ grid, rowTargets, colTargets, onSolved }) => {
  const n = grid.length
  const [cells, setCells] = useState<SumpleteCellState[][]>(() =>
    Array.from({ length: n }, () => new Array<SumpleteCellState>(n).fill("unknown"))
  )

  const toggle = useCallback(
    (r: number, c: number) =>
      setCells(prev => {
        const next = prev.map(row => [...row])
        next[r][c] = cycle(prev[r][c])
        return next
      }),
    []
  )

  const rowStatuses = computeRowStatuses(grid, cells, rowTargets)
  const colStatuses = computeColStatuses(grid, cells, colTargets)
  const solved = isSumpleteSolved(rowStatuses, colStatuses)

  useEffect(() => {
    if (solved) onSolved()
  }, [solved, onSolved])

  return (
    <SumpleteBoard
      grid={grid}
      rowTargets={rowTargets}
      colTargets={colTargets}
      cells={cells}
      rowStatuses={rowStatuses}
      colStatuses={colStatuses}
      onToggle={toggle}
    />
  )
}
