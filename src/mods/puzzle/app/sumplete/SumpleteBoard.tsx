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
  /**
   * How many lines the completion run has checked off (`puzzle-screens.md` §3): the rows top to bottom first,
   * then the columns left to right. Unset means no run.
   */
  checked?: number
  onToggle: (row: number, col: number) => void
}

const cellKey = (row: number, col: number) => `${row},${col}`

/**
 * The numbers a hint is about, hatched.
 *
 * **The words name this** — "cross out the hatched numbers" leaves nothing to match up, where "everything
 * else has to go" leaves the player deciding which numbers that was (`puzzle-screens.md` §4). The same
 * treatment means the same thing on eclipse's and star battle's boards.
 */
const HATCH = {
  backgroundImage: "repeating-linear-gradient(45deg, transparent 0 5px, rgba(252,211,77,0.45) 5px 7px)",
}

const cellCls = (mark: SumpleteMark, lit: boolean, inLitLine: boolean) =>
  // The digit is the thing being read, so it takes as much of the tile as the tile can spare.
  clsx(
    "relative flex aspect-square items-center justify-center rounded border text-[min(6.5vw,1.6rem)] font-semibold transition-colors",
    {
      "border-stone-500 bg-stone-700 text-stone-200": mark === "unknown",
      "border-stone-700 bg-stone-900 text-stone-400": mark === "strike",
      // Green, matching a satisfied line's target: both mean "settled, stop reconsidering this".
      "border-green-600 bg-green-900/50 text-green-200": mark === "keep",
      "ring-1 ring-sky-700": inLitLine && !lit,
      "ring-2 ring-sky-300": lit,
    }
  )

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
const LineTarget: FC<{ line: SumpleteLine; checking?: boolean }> = ({ line, checking }) => (
  // The run flares the target rather than the numbers, because the target IS the claim: a line that adds up
  // is what this board wins by, and it is already the thing that turns green when it does.
  <div className={clsx(lineCls(line), checking && "animate-flare")}>
    <span className="text-[min(5.5vw,1.35rem)] leading-none font-bold text-white">{line.target}</span>
    <span className="text-[min(3.4vw,0.8rem)] leading-none opacity-80">{line.total}</span>
  </div>
)

// Sized off its container and the viewport height, never off a pixel constant: the whole board — grid
// plus its target column and row — has to fit a phone screen without pan or zoom
// (docs/instructions/puzzle-screens.md §1). Width comes from the container rather than from `vw`, so
// the modal's own padding can never push the board past the screen edge.
export const SumpleteBoard: FC<Props> = ({ grid, cells, rows, cols, highlighted, litLine, checked, onToggle }) => {
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
              style={highlighted?.has(cellKey(row, col)) ? HATCH : undefined}
            >
              <span>{value}</span>
              {/* One diagonal stroke corner to corner, inset from the real corners — a glyph laid
                  over the digit hid it, and a player rechecking what they crossed out has to be
                  able to read it back. */}
              {cells[row][col] === "strike" && (
                <span className="pointer-events-none absolute inset-[18%]">
                  <span className="absolute top-0 left-0 h-0.5 w-[141%] origin-top-left rotate-45 rounded-full bg-red-500/80" />
                </span>
              )}
            </button>
          ))}
          {/* The rows are checked off first, so a row's turn is its own index. */}
          <LineTarget line={rows[row]} checking={checked !== undefined && row < checked} />
        </div>
      ))}
      {cols.map((line, col) => (
        // The columns follow the rows, so their turns run from `size` up.
        <LineTarget key={col} line={line} checking={checked !== undefined && size + col < checked} />
      ))}
    </div>
  )
}
