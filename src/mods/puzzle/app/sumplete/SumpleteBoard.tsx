import clsx from "clsx"
import type { FC } from "react"
import { Tile, type TileVariant } from "@/ui/atoms/Tile"
import type { SumpleteLineStatus } from "@/mods/puzzle/game/sumplete/sumpleteStatus"
import type { SumpleteCellState } from "@/mods/puzzle/game/sumplete/sumpleteState"

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
  clsx("flex size-10 items-center justify-center rounded border text-sm font-bold", {
    "border-green-600 bg-green-900/40 text-green-400": s === "exact",
    "border-red-700 bg-red-900/40 text-red-400": s === "over",
    "border-stone-600 bg-stone-800/60 text-stone-400": s === "under",
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
      <div className="ml-1 size-10" />
    </div>
  </div>
)
