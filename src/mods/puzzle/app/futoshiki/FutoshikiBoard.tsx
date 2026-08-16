import clsx from "clsx"
import type { FC } from "react"
import type { FutoshikiCell } from "@/mods/puzzle/game/futoshiki/futoshikiState"
import type { FutoshikiConflicts } from "@/mods/puzzle/game/futoshiki/futoshikiStatus"
import {
  futoshikiCellKey,
  type FutoshikiCellRef,
  type FutoshikiConstraint,
  type FutoshikiPuzzleData,
} from "@/mods/puzzle/game/futoshiki/techniques"

type Props = {
  puzzle: FutoshikiPuzzleData
  cells: FutoshikiCell[][]
  conflicts: FutoshikiConflicts
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

const signKey = (constraint: Pick<FutoshikiConstraint, "row" | "col" | "direction">) =>
  `${constraint.row},${constraint.col},${constraint.direction}`

// Cell tracks take the space; the gaps between them are only wide enough to carry a sign, so a 5-wide
// board still leaves every cell a thumb-sized tap target inside a 360px modal.
const trackTemplate = (size: number) =>
  Array.from({ length: 2 * size - 1 }, (_, index) => (index % 2 === 0 ? "minmax(0,1fr)" : "0.38fr")).join(" ")

const cellCls = (cell: FutoshikiCell, state: { lit: boolean; selected: boolean; conflicted: boolean }) =>
  clsx("flex aspect-square items-center justify-center rounded border transition-colors", {
    "border-stone-600 bg-stone-800 text-stone-500": !cell.given && !state.conflicted,
    // A pre-filled number is part of the puzzle, not of the answer — it reads as stone, not as ink.
    "border-stone-500 bg-stone-700 text-amber-200": cell.given && !state.conflicted,
    "border-red-600 bg-red-950/70 text-red-300": state.conflicted,
    "ring-2 ring-sky-300": state.selected,
    "ring-2 ring-amber-300": state.lit && !state.selected,
  })

const NoteGrid: FC<{ notes: number[]; size: number }> = ({ notes, size }) => (
  <span
    className="grid size-full place-items-center p-[6%] text-[min(2.6vw,0.65rem)] leading-none"
    style={{ gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(size))}, minmax(0, 1fr))` }}
  >
    {/* Every number keeps its own spot whether or not it is pencilled in, so a note does not move
        when its neighbour is rubbed out. The unwritten ones are spacers, and hidden from a reader
        that would otherwise announce an empty square as "1 2 3 4". */}
    {Array.from({ length: size }, (_, index) => index + 1).map(value =>
      notes.includes(value) ? (
        <span key={value} className="text-sky-300">
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

// Sized off its container and the viewport height, never off a pixel constant: the board has to fit a
// phone screen without pan or zoom (docs/instructions/puzzle-screens.md §1).
export const FutoshikiBoard: FC<Props> = ({ puzzle, cells, conflicts, selected, highlighted, litSigns, onSelect }) => {
  const { size } = puzzle
  const template = trackTemplate(size)
  const signs = new Map(puzzle.constraints.map((constraint, index) => [signKey(constraint), { constraint, index }]))

  return (
    <div
      className="grid aspect-square w-full max-w-[min(56vh,26rem)] gap-0.5 select-none"
      style={{ gridTemplateColumns: template, gridTemplateRows: template }}
    >
      {cells.flatMap((row, rowIndex) =>
        row.flatMap((cell, colIndex) => {
          const key = futoshikiCellKey(rowIndex, colIndex)
          const rendered = [
            <button
              key={key}
              onClick={() => onSelect(rowIndex, colIndex)}
              style={{ gridColumn: 2 * colIndex + 1, gridRow: 2 * rowIndex + 1 }}
              className={cellCls(cell, {
                lit: highlighted?.has(key) ?? false,
                selected: selected?.row === rowIndex && selected?.col === colIndex,
                conflicted: conflicts.cells.has(key),
              })}
            >
              {cell.value === undefined ? (
                <NoteGrid notes={cell.notes} size={size} />
              ) : (
                <span className={clsx("text-[min(8vw,2rem)] font-semibold", !cell.given && "text-stone-100")}>
                  {cell.value}
                </span>
              )}
            </button>,
          ]
          for (const direction of ["right", "down"] as const) {
            const found = signs.get(signKey({ row: rowIndex, col: colIndex, direction }))
            if (!found) continue
            const broken = conflicts.constraints.has(found.index)
            rendered.push(
              <span
                key={`${key},${direction}`}
                style={{
                  gridColumn: 2 * colIndex + 1 + (direction === "right" ? 1 : 0),
                  gridRow: 2 * rowIndex + 1 + (direction === "down" ? 1 : 0),
                }}
                className={clsx("flex items-center justify-center text-[min(4.5vw,1.1rem)] leading-none font-bold", {
                  "text-stone-400": !broken && !litSigns?.has(found.index),
                  "text-amber-300": !broken && litSigns?.has(found.index),
                  "text-red-400": broken,
                })}
              >
                {SIGN_GLYPH[direction][found.constraint.relation]}
              </span>
            )
          }
          return rendered
        })
      )}
    </div>
  )
}
