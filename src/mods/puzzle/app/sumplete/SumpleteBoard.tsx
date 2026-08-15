import clsx from "clsx"
import type { FC } from "react"
import type { SumpleteLine } from "@/mods/puzzle/game/sumplete/sumpleteStatus"
import type { SumpleteMark } from "@/mods/puzzle/game/sumplete/techniques"

type Props = {
  grid: number[][]
  cells: SumpleteMark[][]
  rows: SumpleteLine[]
  cols: SumpleteLine[]
  /** Cell keys ("row,col") the current hint talks about. */
  highlighted?: ReadonlySet<string>
  /** The line the hint reasons about — lit so "this line still needs 6" points somewhere. */
  litLine?: { kind: "row" | "col"; index: number }
  onToggle: (row: number, col: number) => void
}

const cellKey = (row: number, col: number) => `${row},${col}`

const cellCls = (mark: SumpleteMark, lit: boolean, inLitLine: boolean) =>
  clsx("relative flex aspect-square items-center justify-center rounded border font-semibold transition-colors", {
    "border-stone-500 bg-stone-700 text-stone-200": mark === "unknown",
    "border-stone-700 bg-stone-900 text-stone-600": mark === "strike",
    // Green, matching a satisfied line's target: both mean "settled, stop reconsidering this".
    "border-green-600 bg-green-900/50 text-green-200": mark === "keep",
    "ring-1 ring-sky-700": inLitLine && !lit,
    "ring-2 ring-sky-300": lit,
  })

// The target beside a line carries its live total underneath: two techniques reason about "what this
// line still needs", so the player has to be able to see it without adding the row up again
// (docs/game-design/puzzles/sumplete.md §7).
const lineCls = (line: SumpleteLine) =>
  clsx("flex aspect-square flex-col items-center justify-center rounded border", {
    "border-green-600 bg-green-900/40 text-green-400": line.status === "exact",
    "border-red-700 bg-red-900/40 text-red-400": line.status === "over",
    "border-stone-600 bg-stone-800/60 text-stone-400": line.status === "under",
  })

// The target is white for contrast — it is the number the player reads on every glance. The live
// total keeps the line's status colour, so over/under/exact still reads at a distance.
const LineTarget: FC<{ line: SumpleteLine }> = ({ line }) => (
  <div className={lineCls(line)}>
    <span className="text-[max(0.6rem,55%)] leading-none font-bold text-white">{line.target}</span>
    <span className="text-[max(0.5rem,42%)] leading-none opacity-80">{line.total}</span>
  </div>
)

// Sized off its container and the viewport height, never off a pixel constant: the whole board — grid
// plus its target column and row — has to fit a phone screen without pan or zoom
// (docs/instructions/puzzle-screens.md §1). Width comes from the container rather than from `vw`, so
// the modal's own padding can never push the board past the screen edge.
export const SumpleteBoard: FC<Props> = ({ grid, cells, rows, cols, highlighted, litLine, onToggle }) => {
  const size = grid.length
  const inLitLine = (row: number, col: number) =>
    litLine ? (litLine.kind === "row" ? litLine.index === row : litLine.index === col) : false
  return (
    <div
      className="grid w-full max-w-[min(52vh,26rem)] gap-1 text-[min(4.5vw,1.1rem)] select-none"
      style={{ gridTemplateColumns: `repeat(${size + 1}, minmax(0, 1fr))` }}
    >
      {grid.map((values, row) => (
        <div key={row} className="contents">
          {values.map((value, col) => (
            <button
              key={col}
              onClick={() => onToggle(row, col)}
              className={cellCls(cells[row][col], highlighted?.has(cellKey(row, col)) ?? false, inLitLine(row, col))}
            >
              <span className={clsx(cells[row][col] === "strike" && "opacity-30")}>{value}</span>
              {cells[row][col] === "strike" && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-stone-500">
                  ✕
                </span>
              )}
            </button>
          ))}
          <LineTarget line={rows[row]} />
        </div>
      ))}
      {cols.map((line, col) => (
        <LineTarget key={col} line={line} />
      ))}
    </div>
  )
}
