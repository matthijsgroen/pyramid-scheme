import clsx from "clsx"
import type { FC } from "react"
import { boxCount, boxOriginOf, type SudokuPuzzleData } from "@/mods/puzzle/game/sudoku/techniques"
import type { SudokuSkin } from "./skins"

type Props = {
  puzzle: SudokuPuzzleData
  /** The face's roll — passed at all only by a face whose chambers are sheets (`SudokuSkin.scroll`). */
  scroll: NonNullable<SudokuSkin["scroll"]>
  /** The ground the sheets lie on, which is what a chamber being taken up uncovers. */
  board: string
  /** How many chambers the run has reached, in reading order. */
  rolled: number
}

/**
 * A finished register filing itself: each chamber is taken up as a scroll, one after the next
 * (`sudoku.md` §9.1).
 *
 * Drawn as a layer OVER the board rather than by moving the squares, and that is the whole reason this
 * is its own component. A chamber is six separate grid squares, and six squares each scaling about
 * their own middle is six squares shrinking, not one sheet rolling — so what rolls is a sheet-sized
 * thing laid over them, and the squares beneath are left to be the writing that goes up with it.
 *
 * Each chamber's roll runs once, on the frame the run reaches it: a CSS animation starts when its
 * element mounts, so **the mounting IS the timing** and nothing here has to know the clock. When the
 * animation is over the sheet is back at its resting offset — rolled clear of the chamber, covering
 * nothing — so a panel that has had its turn is left mounted and invisible, and the finished board is
 * whole again underneath the banner.
 */
export const SudokuScrolls: FC<Props> = ({ puzzle, scroll, board, rolled }) => (
  <div
    // Decoration over a board that is already fully readable by anything that reads it, so nothing here
    // is announced — and nothing here can be pressed, or a scroll would swallow the square under it.
    aria-hidden
    className="pointer-events-none absolute inset-0 grid"
    style={{
      gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${puzzle.size}, minmax(0, 1fr))`,
    }}
  >
    {Array.from({ length: Math.min(rolled, boxCount(puzzle)) }, (_unused, box) => {
      const { row, col } = boxOriginOf(puzzle, box)
      return (
        <div
          key={box}
          // The chamber's own extent, and the sheet is clipped to it: a roll travelling past the head of
          // one chamber would otherwise lie across the next one down.
          className="relative overflow-hidden"
          style={{
            gridColumn: `${col + 1} / span ${puzzle.boxWidth}`,
            gridRow: `${row + 1} / span ${puzzle.boxHeight}`,
          }}
        >
          <div
            // The table the sheet lay on, uncovered from the foot of the chamber up as the roll climbs.
            // Resting a chamber-height and a little DOWN, which is where the animation leaves it too —
            // inline, because a keyframe outranks an inline style for as long as it is playing and not a
            // frame longer. The little extra is the roll's own overhang: at a flat 100% the top half of
            // the roll would sit inside the foot of the chamber, a pale band across a board that is
            // supposed to be finished and whole.
            className={clsx("absolute inset-0 animate-furl", board)}
            style={{ translate: "0 106%", boxShadow: `inset 0 10px 14px -4px ${scroll.shade}` }}
          >
            <div
              // The roll itself, straddling the edge it has reached: half over the bare table it has
              // uncovered, half over the sheet it is about to take up.
              className="absolute inset-x-0 top-0 h-[11%] min-h-2 -translate-y-1/2 rounded-full"
              style={{
                background: scroll.roll,
                // Cast both ways, or the roll is a shape lying flat on the board.
                boxShadow: `0 -3px 7px ${scroll.shade}, 0 4px 6px -2px ${scroll.shade}`,
              }}
            />
          </div>
        </div>
      )
    })}
  </div>
)
