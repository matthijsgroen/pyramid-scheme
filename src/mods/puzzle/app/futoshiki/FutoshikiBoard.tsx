import clsx from "clsx"
import type { FC } from "react"
import type { FutoshikiCell } from "@/mods/puzzle/game/futoshiki/futoshikiState"
import { futoshikiNoteKey, type FutoshikiConflicts } from "@/mods/puzzle/game/futoshiki/futoshikiStatus"
import {
  futoshikiCellKey,
  type FutoshikiCellRef,
  type FutoshikiPuzzleData,
} from "@/mods/puzzle/game/futoshiki/techniques"

type Props = {
  puzzle: FutoshikiPuzzleData
  cells: FutoshikiCell[][]
  conflicts: FutoshikiConflicts
  /** Note keys ("row,col,value") a number placed elsewhere in the line has ruled out. */
  stranded?: ReadonlySet<string>
  selected?: FutoshikiCellRef
  /** Cell keys ("row,col") the current hint talks about. */
  highlighted?: ReadonlySet<string>
  /** Constraint indices the current hint points at. */
  litSigns?: ReadonlySet<number>
  onSelect: (row: number, col: number) => void
}

// Sign glyphs, not words: the point of the mark always opens toward the bigger number, in either
// direction (PUZZLE_FAMILIES.md P2 — the board carries no language).
const SIGN_GLYPH: Record<"right" | "down", Record<"<" | ">", string>> = {
  right: { "<": "<", ">": ">" },
  down: { "<": "∧", ">": "∨" },
}

// The square is its own sizing context, so the digit and the pencilled notes inside it scale with the
// square rather than with the screen — a 4-wide board and a 7-wide one then read the same.
const cellCls = (cell: FutoshikiCell, state: { lit: boolean; selected: boolean; conflicted: boolean }) =>
  clsx("@container flex aspect-square items-center justify-center rounded border transition-colors", {
    "border-stone-600 bg-stone-800 text-stone-500": !cell.given && !state.conflicted,
    // A pre-filled number is part of the puzzle, not of the answer — it reads as stone, not as ink.
    "border-stone-500 bg-stone-700 text-amber-200": cell.given && !state.conflicted,
    // A repeat has to be loud. A dark wash behind a white digit was the whole tell before, and on a
    // dark board at arm's length it read as no tell at all.
    "border-red-500 bg-red-900 text-red-200": state.conflicted,
    "ring-2 ring-sky-300": state.selected,
    "ring-2 ring-amber-300": state.lit && !state.selected,
    "ring-2 ring-red-500": state.conflicted && !state.selected && !state.lit,
  })

const NoteGrid: FC<{
  notes: number[]
  size: number
  row: number
  col: number
  stranded?: ReadonlySet<string>
}> = ({ notes, size, row, col, stranded }) => (
  <span
    className="grid size-full place-items-center p-[6%] text-[20cqw] leading-none"
    style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(size))}, minmax(0, 1fr))` }}
  >
    {/* Every number keeps its own spot whether or not it is pencilled in, so a note does not move
        when its neighbour is rubbed out. The unwritten ones are spacers, and hidden from a reader
        that would otherwise announce an empty square as "1 2 3 4". */}
    {Array.from({ length: size }, (_, index) => index + 1).map(value =>
      notes.includes(value) ? (
        <span
          key={value}
          // Struck rather than deleted: the note is still the player's, and the number that ruled it
          // out may itself be wrong and get corrected.
          className={stranded?.has(futoshikiNoteKey(row, col, value)) ? "text-red-400/80 line-through" : "text-sky-300"}
        >
          {value}
        </span>
      ) : (
        <span key={value} aria-hidden className="text-transparent">
          {value}
        </span>
      )
    )}
  </span>
)

/**
 * The signs, laid over the board rather than beside it. Each one spans the two squares it separates
 * and centres itself, which lands it exactly on the gutter between them whatever the grid measures.
 *
 * Giving the signs grid tracks of their own instead would spend a quarter of the width on them, and
 * that is what a 7-wide board cannot afford: on a 360px screen the squares have to keep every pixel
 * to stay a thumb wide (docs/instructions/puzzle-screens.md §1).
 */
const SignLayer: FC<{ puzzle: FutoshikiPuzzleData; conflicts: FutoshikiConflicts; lit?: ReadonlySet<number> }> = ({
  puzzle,
  conflicts,
  lit,
}) => (
  <div
    className="pointer-events-none absolute inset-0 grid gap-px"
    style={{
      gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${puzzle.size}, minmax(0, 1fr))`,
    }}
  >
    {puzzle.constraints.map((constraint, index) => {
      const broken = conflicts.constraints.has(index)
      const down = constraint.direction === "down"
      return (
        <span
          key={`${constraint.row},${constraint.col},${constraint.direction}`}
          style={{
            gridColumn: `${constraint.col + 1} / span ${down ? 1 : 2}`,
            gridRow: `${constraint.row + 1} / span ${down ? 2 : 1}`,
          }}
          // The chip carries the board's own backdrop, so a sign sitting on the corner of two squares
          // reads as a notch between them rather than as ink spilled over a digit.
          className={clsx(
            "place-self-center rounded-full bg-stone-900 px-[0.15em] text-[min(3.6vw,0.95rem)] leading-none font-bold",
            {
              "text-stone-400": !broken && !lit?.has(index),
              "text-amber-300": !broken && lit?.has(index),
              "text-red-400": broken,
            }
          )}
        >
          {SIGN_GLYPH[constraint.direction][constraint.relation]}
        </span>
      )
    })}
  </div>
)

// Sized off its container and the viewport height, never off a pixel constant: the board has to fit a
// phone screen without pan or zoom (docs/instructions/puzzle-screens.md §1).
export const FutoshikiBoard: FC<Props> = ({
  puzzle,
  cells,
  conflicts,
  stranded,
  selected,
  highlighted,
  litSigns,
  onSelect,
}) => {
  const { size } = puzzle
  return (
    <div className="relative aspect-square w-full max-w-[min(56vh,26rem)] select-none">
      <div
        className="grid size-full gap-px"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = futoshikiCellKey(rowIndex, colIndex)
            const conflicted = conflicts.cells.has(key)
            return (
              <button
                key={key}
                onClick={() => onSelect(rowIndex, colIndex)}
                className={cellCls(cell, {
                  lit: highlighted?.has(key) ?? false,
                  selected: selected?.row === rowIndex && selected?.col === colIndex,
                  conflicted,
                })}
              >
                {cell.value === undefined ? (
                  <NoteGrid notes={cell.notes} size={size} row={rowIndex} col={colIndex} stranded={stranded} />
                ) : (
                  <span
                    className={clsx("text-[58cqw] font-semibold", {
                      // The digit takes the conflict colour too: forcing ink-white here was what
                      // swallowed the warning, since the square's own red never reached the number.
                      "text-stone-100": !cell.given && !conflicted,
                      "text-red-100": conflicted,
                    })}
                  >
                    {cell.value}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
      <SignLayer puzzle={puzzle} conflicts={conflicts} lit={litSigns} />
    </div>
  )
}
