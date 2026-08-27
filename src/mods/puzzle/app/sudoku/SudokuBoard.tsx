import clsx from "clsx"
import type { FC } from "react"
import type { SudokuCell } from "@/mods/puzzle/game/sudoku/sudokuState"
import { sudokuNoteKey } from "@/mods/puzzle/game/sudoku/sudokuStatus"
import {
  boxIndexOf,
  sudokuCellKey,
  type SudokuCellRef,
  type SudokuPuzzleData,
} from "@/mods/puzzle/game/sudoku/techniques"
import { GridWalls, WALL_WIDTH } from "../GridWalls"
import { SudokuScrolls } from "./SudokuScrolls"
import type { SudokuSkin } from "./skins"

type Props = {
  puzzle: SudokuPuzzleData
  cells: SudokuCell[][]
  /** Which place this room is — everything on the board that is not a rule comes from here. */
  skin: SudokuSkin
  /** Cell keys ("row,col") showing a value that already stands in their row, column or chamber. */
  conflicts: ReadonlySet<string>
  /** Note keys ("row,col,value") a value placed elsewhere in the group has ruled out. */
  stranded?: ReadonlySet<string>
  selected?: SudokuCellRef
  /** Cell keys the current hint SETTLES — hatched, and named as "the hatched squares". */
  hatched?: ReadonlySet<string>
  /** Cell keys the current hint argues FROM — ringed, so evidence never looks like conclusion. */
  marked?: ReadonlySet<string>
  /**
   * The value the picked square holds, or unset where it holds none.
   *
   * Every square holding it washes, and every square that has it PENCILLED IN brightens that one
   * option — because the question a player asks when they tap a 4 is "where else is the 4, and where
   * could it still go", and those are one question a step apart. An empty square answers neither, so
   * picking one says nothing.
   */
  twinned?: number
  /**
   * Which value the completion run is on (`puzzle-screens.md` §3), or unset for no run.
   *
   * **A tick is a VALUE, not a square**, and that is this family's own rule read back rather than a house
   * style: what the board claims is that each of the six stands once in every row, every column and every
   * chamber, so the run settles all six homes of the 1 at once, then all six of the 2, to the last. Every
   * square still to come shows the value the roll is on, so the whole board turns over together.
   */
  counted?: number
  /**
   * How many chambers the run has taken up, in reading order, or unset for no run.
   *
   * The register's own way of finishing, and it counts CHAMBERS where the value run counts values: a
   * sheet is not lit when it is done with, it is rolled and put away. A face whose chambers are cut in
   * stone carries no scroll and is handed none of this — see `counted` for what it gets instead.
   */
  rolled?: number
  onSelect: (row: number, col: number) => void
}

/**
 * The squares a hint is about, hatched.
 *
 * **The words name this** (`puzzle-screens.md` §4.2), which is the whole reason it is a hatch and not
 * another ring or another shade: "rule out 𓁹 in the hatched squares" leaves nothing to match up, where
 * "the rest of the chamber" leaves the player deciding which squares that was.
 */
const hatchOf = (skin: SudokuSkin) => `repeating-linear-gradient(45deg, transparent 0 5px, ${skin.hatch} 5px 7px)`

/** The wash over a square holding the picked value — a flat layer, so the ground beneath still reads. */
const twinOf = (skin: SudokuSkin) => `linear-gradient(${skin.twin}, ${skin.twin})`

/** Whether the square across this edge belongs to another chamber — or there is no square there at all. */
const chamberEdge = (puzzle: SudokuPuzzleData, row: number, col: number, dRow: number, dCol: number): boolean => {
  const [nextRow, nextCol] = [row + dRow, col + dCol]
  if (nextRow < 0 || nextRow >= puzzle.size || nextCol < 0 || nextCol >= puzzle.size) return true
  return boxIndexOf(puzzle, nextRow, nextCol) !== boxIndexOf(puzzle, row, col)
}

const NoteGrid: FC<{
  notes: number[]
  skin: SudokuSkin
  size: number
  row: number
  col: number
  stranded?: ReadonlySet<string>
  twinned?: number
}> = ({ notes, skin, size, row, col, stranded, twinned }) => (
  <span
    className="grid size-full place-items-center p-[6%] leading-none"
    style={{
      gridTemplateColumns: `repeat(${Math.ceil(size / 2)}, minmax(0, 1fr))`,
      fontSize: skin.size.note,
    }}
  >
    {/* Every value keeps its own spot whether or not it is pencilled in, so a note does not move when
        its neighbour is rubbed out. The unwritten ones are spacers, and hidden from a reader that
        would otherwise announce an empty square as "1 2 3 4 5 6". */}
    {Array.from({ length: size }, (_unused, index) => index + 1).map(value =>
      notes.includes(value) ? (
        <span
          key={value}
          // Struck rather than deleted: the note is still the player's, and the value that ruled it out
          // may itself be wrong and get corrected. A struck note stays struck even when it is the
          // picked value — that it cannot go here is the louder fact of the two.
          className={clsx(
            stranded?.has(sudokuNoteKey(row, col, value))
              ? skin.strandedNote
              : value === twinned
                ? skin.twinNote
                : skin.note
          )}
        >
          <skin.Glyph value={value} />
        </span>
      ) : (
        // A spacer, so a note keeps its own place whether or not it is pencilled in. A drawn sign
        // takes its colour from here like any other, so transparent hides it as surely as it hides a
        // figure.
        <span key={value} aria-hidden className="text-transparent">
          <skin.Glyph value={value} />
        </span>
      )
    )}
  </span>
)

// Sized off its container and the viewport height, never off a pixel constant: the board has to fit a
// phone screen without pan or zoom (docs/instructions/puzzle-screens.md §1).
export const SudokuBoard: FC<Props> = ({
  puzzle,
  cells,
  skin,
  conflicts,
  stranded,
  selected,
  hatched,
  marked,
  twinned,
  counted,
  rolled,
  onSelect,
}) => {
  const { size } = puzzle
  const hatch = hatchOf(skin)
  const twin = twinOf(skin)
  return (
    // `relative`, because the completion run lays whole sheets over the grid rather than moving squares
    // about inside it — see `SudokuScrolls`.
    <div
      className={clsx("relative aspect-square w-full max-w-[min(56vh,26rem)] select-none", skin.board)}
      // The rim is a chamber wall like any other, so it is drawn centred on the board's edge and half of it
      // falls outside the grid. The room for that half is reserved here rather than left to bleed.
      style={{ padding: WALL_WIDTH / 2 }}
    >
      <div
        className="relative grid size-full"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = sudokuCellKey(rowIndex, colIndex)
            const conflicted = conflicts.has(key)
            const settled = counted !== undefined && cell.value !== undefined && cell.value <= counted
            return (
              <button
                key={key}
                onClick={() => onSelect(rowIndex, colIndex)}
                style={{
                  // Every edge alike: the chamber walls are drawn over the top of these, by `GridWalls`.
                  borderColor: skin.seam,
                  // Layered rather than swapped, top down: the hint's hatching over the twin wash over
                  // the ground's own grain. A hatched square is still a square of the same sheet, and a
                  // twin the hint happens to be about must not stop looking like either.
                  backgroundImage:
                    [hatched?.has(key) && hatch, cell.value !== undefined && cell.value === twinned && twin, skin.grain]
                      .filter(Boolean)
                      .join(", ") || undefined,
                }}
                className={clsx(
                  // The square is its own sizing context, so the token and the pencilled notes inside it
                  // scale with the square rather than with the screen.
                  "@container flex aspect-square items-center justify-center border transition-colors",
                  conflicted ? skin.conflict : cell.given ? skin.given : skin.cell,
                  // Inset, because the squares touch: a ring drawn outside one would sit on top of its
                  // neighbour. The square the player has picked first — it is the one they are acting on —
                  // then what a hint argues FROM. Evidence and conclusion never look the same, which is why
                  // the settled squares are hatched above rather than ringed here.
                  selected?.row === rowIndex && selected?.col === colIndex
                    ? `ring-3 ring-inset ${skin.focus}`
                    : marked?.has(key) && `ring-2 ring-inset ${skin.evidence}`
                )}
              >
                {cell.value === undefined ? (
                  <NoteGrid
                    notes={cell.notes}
                    skin={skin}
                    size={size}
                    row={rowIndex}
                    col={colIndex}
                    stranded={stranded}
                    twinned={twinned}
                  />
                ) : (
                  <span
                    style={{ fontSize: skin.size.value }}
                    className={clsx(
                      "inline-block leading-none font-semibold",
                      conflicted ? skin.conflictInk : cell.given ? skin.givenInk : skin.ink,
                      settled && skin.celebrate
                    )}
                  >
                    <skin.Glyph value={counted !== undefined && !settled ? counted : cell.value} />
                  </span>
                )}
              </button>
            )
          })
        )}
        <GridWalls
          size={size}
          isWall={(row, col, dRow, dCol) => chamberEdge(puzzle, row, col, dRow, dCol)}
          colour={skin.wall}
        />
      </div>
      {skin.scroll && rolled !== undefined && (
        <SudokuScrolls puzzle={puzzle} scroll={skin.scroll} board={skin.board} rolled={rolled} />
      )}
    </div>
  )
}
