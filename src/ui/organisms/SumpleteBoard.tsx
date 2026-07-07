import clsx from "clsx"
import type { FC } from "react"
import { Tile, type TileVariant } from "@/ui/atoms/Tile"
import type { SumpleteLineStatus } from "@/game/puzzles/sumplete/sumpleteStatus"
import type { SumpleteCellState } from "@/game/puzzles/sumplete/sumpleteState"

type Props = {
  grid: number[][]
  rowTargets: number[]
  colTargets: number[]
  cells: SumpleteCellState[][]
  rowStatuses: SumpleteLineStatus[]
  colStatuses: SumpleteLineStatus[]
  onToggle: (row: number, col: number) => void
}

const cellVariant: Record<SumpleteCellState, TileVariant> = {
  unknown: "default",
  excluded: "excluded",
  included: "included",
}

const targetCls = (s: SumpleteLineStatus) =>
  clsx("flex h-10 w-10 items-center justify-center rounded border text-sm font-bold", {
    "text-green-400 bg-green-900/40 border-green-600": s === "exact",
    "text-red-400 bg-red-900/40 border-red-700": s === "over",
    "text-stone-400 bg-stone-800/60 border-stone-600": s === "under",
  })

export const SumpleteBoard: FC<Props> = ({
  grid,
  rowTargets,
  colTargets,
  cells,
  rowStatuses,
  colStatuses,
  onToggle,
}) => (
  <div className="inline-block select-none">
    {grid.map((row, i) => (
      <div key={i} className="mb-1 flex items-center gap-1">
        {row.map((val, j) => (
          <Tile key={j} value={val} variant={cellVariant[cells[i][j]]} onClick={() => onToggle(i, j)} />
        ))}
        <div className={clsx("ml-1", targetCls(rowStatuses[i]))}>{rowTargets[i]}</div>
      </div>
    ))}
    <div className="mt-1 flex items-center gap-1">
      {colTargets.map((t, j) => (
        <div key={j} className={targetCls(colStatuses[j])}>
          {t}
        </div>
      ))}
      <div className="ml-1 h-10 w-10" />
    </div>
  </div>
)
