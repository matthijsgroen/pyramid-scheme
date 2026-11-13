import clsx from "clsx"
import type { FC } from "react"
import type { InputHandler, InputSignal } from "@/app/input/actions"
import { useGridCursor, type GridCell } from "@/app/input/useGridCursor"
import { useInputLayer } from "@/app/input/useInputLayer"
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
  /**
   * Which number the completion run is on (`puzzle-screens.md`: the family owns its celebration), or unset
   * for no run.
   *
   * The whole board counts together: a square holding this number or lower has settled and shows its own
   * digit, and every square still to come shows the count instead — so the board rolls 1, 2, 3 … and each
   * number drops out of the roll as it is reached.
   */
  counted?: number
  onSelect: (row: number, col: number) => void
  /** The shell's `boardInput`: with it the board takes keys and pad, a cursor whose confirm is a tap. */
  boardInput?: (board: InputHandler) => InputHandler
  /** Where a direction took the cursor: the picked square follows it. */
  onCursor?: (row: number, col: number) => void
  /** The pad's keys, for the square under the cursor (padKeys), asked before the cursor's own. */
  padKeys?: (signal: InputSignal, at: GridCell) => boolean
}

// One chevron, turned four ways: the point of the mark always opens toward the bigger number, in
// either direction (PUZZLE_FAMILIES.md P2 — the board carries no language). Drawn rather than typed,
// because a typeface's "<" is a mathematical glyph sized to sit in a line of prose — thin, and lost
// against a stone square at arm's length. A stroked path takes the weight the board needs and keeps
// it at every grid size.
const SIGN_TURN: Record<"right" | "down", Record<"<" | ">", number>> = {
  right: { "<": 180, ">": 0 },
  down: { "<": -90, ">": 90 },
}

// Sized off the BOARD, not the viewport: the layer is its own container, so the mark scales with the
// squares. A viewport-relative size drifts the other way — the squares shrink as the grid grows while
// the sign does not, and a 6x6 ends up smothered.
//
// It takes a **smaller share** of the square as the grid grows (44% at 4 wide, 36% at 6), because an
// equal share is not an equal reading: at 4 wide the square has room for a bold chevron beside its
// digit, and at 6 the same share crowds the digit it is meant to sit between. The mark still grows in
// absolute terms wherever the board is bigger than a phone.
const signShare = (size: number) => 44 - (size - 4) * 4

const SignMark: FC<{ direction: "right" | "down"; relation: "<" | ">"; size: number }> = ({
  direction,
  relation,
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    style={{ width: `${signShare(size) / size}cqw`, height: `${signShare(size) / size}cqw` }}
    aria-hidden
    focusable="false"
  >
    <polyline
      points="9,4 17,12 9,20"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={`rotate(${SIGN_TURN[direction][relation]} 12 12)`}
    />
  </svg>
)

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
 * to stay a thumb wide (docs/instructions/puzzle-screens.md: tap targets of at least 44px).
 *
 * The layer stacks above the cursor's lift, and a sign on the cursor's square steps out with the lift
 * (`cursor-beside`), so the lifted square never covers it.
 */
const SignLayer: FC<{
  puzzle: FutoshikiPuzzleData
  conflicts: FutoshikiConflicts
  lit?: ReadonlySet<number>
  cursor: GridCell
}> = ({ puzzle, conflicts, lit, cursor }) => (
  <div
    className="@container pointer-events-none absolute inset-0 z-10 grid gap-px"
    style={{
      gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${puzzle.size}, minmax(0, 1fr))`,
      ["--cell" as string]: `calc(100cqw / ${puzzle.size})`,
    }}
  >
    {puzzle.constraints.map((constraint, index) => {
      const broken = conflicts.constraints.has(index)
      const down = constraint.direction === "down"
      const onFirst = cursor.row === constraint.row && cursor.col === constraint.col
      const onSecond = down
        ? cursor.row === constraint.row + 1 && cursor.col === constraint.col
        : cursor.row === constraint.row && cursor.col === constraint.col + 1
      const away = onFirst ? 1 : onSecond ? -1 : 0
      return (
        <span
          key={`${constraint.row},${constraint.col},${constraint.direction}`}
          style={{
            gridColumn: `${constraint.col + 1} / span ${down ? 1 : 2}`,
            gridRow: `${constraint.row + 1} / span ${down ? 2 : 1}`,
            ["--beside-x" as string]: down ? 0 : away,
            ["--beside-y" as string]: down ? away : 0,
          }}
          // The mark sits straight on the gutter with no disc behind it: the gap between two squares is
          // already a dark line, so the chevron reads as a notch in the stone without one, and the disc
          // was ink the board did not need.
          className={clsx("cursor-beside place-self-center leading-none", {
            "text-stone-300": !broken && !lit?.has(index),
            "text-amber-300": !broken && lit?.has(index),
            "text-red-400": broken,
          })}
        >
          <SignMark direction={constraint.direction} relation={constraint.relation} size={puzzle.size} />
        </span>
      )
    })}
  </div>
)

// Sized off its container and the viewport height, never off a pixel constant: the board has to fit a
// phone screen without pan or zoom (docs/instructions/puzzle-screens.md).
export const FutoshikiBoard: FC<Props> = ({
  puzzle,
  cells,
  conflicts,
  stranded,
  selected,
  highlighted,
  litSigns,
  counted,
  onSelect,
  boardInput,
  onCursor,
  padKeys,
}) => {
  const { size } = puzzle
  const cursor = useGridCursor({
    rows: size,
    cols: size,
    start: () => {
      const open = Math.max(
        cells.flat().findIndex(cell => !cell.given),
        0
      )
      return { row: Math.floor(open / size), col: open % size }
    },
    onConfirm: onSelect,
    onMove: onCursor,
  })
  const handle: InputHandler = signal =>
    !!padKeys?.(signal, { row: cursor.row, col: cursor.col }) || cursor.handle(signal)
  useInputLayer(boardInput ? boardInput(handle) : handle, boardInput !== undefined)
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
                onClick={() => cursor.tap(rowIndex, colIndex)}
                className={clsx(
                  cellCls(cell, {
                    lit: highlighted?.has(key) ?? false,
                    selected: selected?.row === rowIndex && selected?.col === colIndex,
                    conflicted,
                  }),
                  cursor.at(rowIndex, colIndex) && "board-cursor"
                )}
              >
                {cell.value === undefined ? (
                  <NoteGrid notes={cell.notes} size={size} row={rowIndex} col={colIndex} stranded={stranded} />
                ) : (
                  <span
                    className={clsx("inline-block text-[58cqw] font-semibold", {
                      // The digit takes the conflict colour too: forcing ink-white here was what
                      // swallowed the warning, since the square's own red never reached the number.
                      "text-stone-100": !cell.given && !conflicted,
                      "text-red-100": conflicted,
                      // The number the roll has just settled on — see `counted`.
                      "animate-bloom": counted !== undefined && cell.value <= counted,
                    })}
                  >
                    {counted !== undefined && cell.value > counted ? counted : cell.value}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
      <SignLayer puzzle={puzzle} conflicts={conflicts} lit={litSigns} cursor={{ row: cursor.row, col: cursor.col }} />
    </div>
  )
}
