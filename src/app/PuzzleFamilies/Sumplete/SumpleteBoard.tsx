import clsx from "clsx"
import { useCallback, useEffect, useMemo, useState } from "react"

type CellState = "included" | "excluded" | "unknown"

type Props = {
  grid: number[][]
  rowTargets: number[]
  colTargets: number[]
  onSolved: () => void
}

const cycle = (s: CellState): CellState => (s === "unknown" ? "excluded" : s === "excluded" ? "included" : "unknown")

export const SumpleteBoard = ({ grid, rowTargets, colTargets, onSolved }: Props) => {
  const n = grid.length
  const [cells, setCells] = useState<CellState[][]>(() =>
    Array.from({ length: n }, () => new Array<CellState>(n).fill("unknown"))
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

  const rowSums = useMemo(
    () => cells.map((row, i) => row.reduce((s, st, j) => s + (st !== "excluded" ? grid[i][j] : 0), 0)),
    [cells, grid]
  )
  const colSums = useMemo(
    () =>
      Array.from({ length: n }, (_, j) => cells.reduce((s, row, i) => s + (row[j] !== "excluded" ? grid[i][j] : 0), 0)),
    [cells, grid, n]
  )

  type Status = "under" | "exact" | "over"
  const rowStatus = (i: number): Status =>
    rowSums[i] === rowTargets[i] ? "exact" : rowSums[i] > rowTargets[i] ? "over" : "under"
  const colStatus = (j: number): Status =>
    colSums[j] === colTargets[j] ? "exact" : colSums[j] > colTargets[j] ? "over" : "under"

  const solved =
    rowTargets.every((_, i) => rowStatus(i) === "exact") && colTargets.every((_, j) => colStatus(j) === "exact")
  useEffect(() => {
    if (solved) onSolved()
  }, [solved, onSolved])

  const targetCls = (s: Status) =>
    clsx("flex h-10 w-10 items-center justify-center rounded border text-sm font-bold", {
      "text-green-400 bg-green-900/40 border-green-600": s === "exact",
      "text-red-400 bg-red-900/40 border-red-700": s === "over",
      "text-stone-400 bg-stone-800/60 border-stone-600": s === "under",
    })

  return (
    <div className="inline-block select-none">
      {grid.map((row, i) => (
        <div key={i} className="mb-1 flex items-center gap-1">
          {row.map((val, j) => {
            const st = cells[i][j]
            return (
              <button
                key={j}
                onClick={() => toggle(i, j)}
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded border text-base font-semibold transition-all duration-100",
                  {
                    "bg-stone-700 border-stone-500 text-stone-200 hover:bg-stone-600": st === "unknown",
                    "bg-stone-900 border-stone-700 text-stone-600 relative": st === "excluded",
                    "bg-amber-800/70 border-amber-500 text-amber-100 shadow shadow-amber-900": st === "included",
                  }
                )}
              >
                {st === "excluded" ? (
                  <>
                    <span className="opacity-30">{val}</span>
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg text-stone-500">
                      ✕
                    </span>
                  </>
                ) : (
                  val
                )}
              </button>
            )
          })}
          <div className={clsx("ml-1", targetCls(rowStatus(i)))}>{rowTargets[i]}</div>
        </div>
      ))}
      <div className="mt-1 flex items-center gap-1">
        {colTargets.map((t, j) => (
          <div key={j} className={targetCls(colStatus(j))}>
            {t}
          </div>
        ))}
        <div className="ml-1 h-10 w-10" />
      </div>
      {solved && (
        <div className="mt-3 text-center text-sm font-bold tracking-wide text-green-400 uppercase">Solved!</div>
      )}
    </div>
  )
}
