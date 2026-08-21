import clsx from "clsx"
import type { FC } from "react"
import {
  colOf,
  rowOf,
  starBattleConflicts,
  type StarBattleMarks,
  type StarBattlePuzzle,
} from "@/mods/puzzle/game/starBattle/starBattle"
import { useDelayedConflicts } from "../useDelayedConflicts"

type Props = {
  puzzle: StarBattlePuzzle
  state: StarBattleMarks
  /** Squares the current hint reasons FROM — its evidence. */
  highlighted?: ReadonlySet<number>
  /** The one square the current hint is ABOUT, drawn stronger than its evidence. */
  focus?: number
  onTapCell: (cell: number) => void
}

/** The answer: a shape, so it reads without colour. */
const StarGlyph: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full">
    <path
      d="M 0 -42 L 11 -13 L 42 -13 L 17 6 L 26 36 L 0 18 L -26 36 L -17 6 L -42 -13 L -11 -13 Z"
      className="fill-amber-200"
    />
  </svg>
)

/**
 * The player's own "not here" mark.
 *
 * Deliberately slight — a dot rather than a shape. This is the mark they will make most of, and a board
 * covered in marks as heavy as the stars would look as though it had answered itself.
 */
const DarkGlyph: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full">
    <circle r={9} className="fill-stone-500" />
  </svg>
)

/**
 * A boundary is a drawn edge, and it has to be, not a fill.
 *
 * There are as many regions as rows, and a palette that tells eight regions apart is a palette nobody can
 * read at arm's length — a colour-blind player reads none of it. So the shape is carried by the strokes on
 * the edges where two regions meet, and the outer rim of the grid is one of those edges.
 */
const boundary = (puzzle: StarBattlePuzzle, cell: number, dRow: number, dCol: number) => {
  const [row, col] = [rowOf(puzzle.size, cell) + dRow, colOf(puzzle.size, cell) + dCol]
  if (row < 0 || row >= puzzle.size || col < 0 || col >= puzzle.size) return true
  return puzzle.regions[row * puzzle.size + col] !== puzzle.regions[cell]
}

// A blocked square holds nothing and never will. Hatched rather than tinted: it has to read as part of the
// grid rather than as a mark someone made, and a tint is what a mark looks like.
const HATCH = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent 0 4px, rgba(120,113,108,0.55) 4px 6px)" /* stone-500 */,
}

export const StarBattleBoard: FC<Props> = ({ puzzle, state, highlighted, focus, onTapCell }) => {
  const { size } = puzzle
  // Held back a beat: a tap on the way to the dark mark is not a mistake (see the hook).
  const conflicts = useDelayedConflicts(state.marks, marks => starBattleConflicts(puzzle, { marks }))
  return (
    <div className="aspect-square w-full max-w-[min(56vh,26rem)] select-none">
      <div
        className="grid size-full"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {state.marks.map((value, cell) => {
          const blocked = puzzle.blocked[cell]
          return (
            <button
              key={cell}
              onClick={() => onTapCell(cell)}
              disabled={blocked}
              style={blocked ? HATCH : undefined}
              className={clsx(
                "flex aspect-square items-center justify-center bg-stone-800 p-[14%] transition-colors",
                // Thick where two regions meet, hairline inside one. Static classes, so the widths survive
                // whatever the grid size turns out to be.
                boundary(puzzle, cell, -1, 0) ? "border-t-3 border-t-amber-200/80" : "border-t border-t-stone-600/50",
                boundary(puzzle, cell, 1, 0) ? "border-b-3 border-b-amber-200/80" : "border-b border-b-stone-600/50",
                boundary(puzzle, cell, 0, -1) ? "border-l-3 border-l-amber-200/80" : "border-l border-l-stone-600/50",
                boundary(puzzle, cell, 0, 1) ? "border-r-3 border-r-amber-200/80" : "border-r border-r-stone-600/50",
                // Inset, because the squares touch: a ring drawn outside one would sit on top of its
                // neighbour. Conflict first, then the square a hint is about, then its evidence — evidence
                // and conclusion cannot look the same, or "this square" is a guess between six of them.
                conflicts.has(cell)
                  ? "ring-2 ring-red-500/80 ring-inset"
                  : cell === focus
                    ? "ring-3 ring-amber-300 ring-inset"
                    : highlighted?.has(cell) && "ring-2 ring-sky-300/60 ring-inset"
              )}
            >
              {value === "star" ? <StarGlyph /> : value === "dark" ? <DarkGlyph /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
