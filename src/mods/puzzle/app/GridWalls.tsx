import type { FC } from "react"

/**
 * How wide a wall is drawn, in CSS pixels.
 *
 * Held against the seam rather than chosen on its own: the two are told apart by weight, so what matters is
 * that this stays several times the 1px the squares draw on the edges they share.
 */
export const WALL_WIDTH = 5

type Props = {
  /** Squares to a side. The grid this draws over has to be square and evenly divided. */
  size: number
  /**
   * Whether the edge on one side of a square is a wall rather than a seam — a region boundary in star
   * battle, a chamber wall in sudoku. Asked for the square OUTSIDE the grid too, where it answers true.
   */
  isWall: (row: number, col: number, dRow: number, dCol: number) => boolean
  /** What colour the place draws a wall in — amber over a sky, water over farmland. */
  colour: string
}

/**
 * The walls of a divided grid, drawn once along the line each one marks.
 *
 * **A square cannot draw this.** A border belongs to one square and is painted inside it, which went wrong
 * three ways at once. A wall between two squares was drawn from both of them, so it came out twice as thick
 * inside the grid as around the rim, where there is only one square to draw it. Where a board does not land
 * on whole device pixels (an 8×8 star battle on a phone is 46.75px a square) the two halves rounded
 * independently, and the wall drifted off the line it was marking. And a border eats into the square's
 * content box, so a square walled on one side had its middle — and everything the player reads in it —
 * pushed off centre, by squares, in whichever direction its own walls happened to fall.
 *
 * One stroke on the boundary itself has none of them: `non-scaling-stroke` keeps it the same width wherever
 * the board is scaled to, a stroke is centred on its path so the rim is drawn exactly like every wall
 * inside, and the squares are left carrying nothing but their own even seam.
 *
 * Half of the rim's stroke falls outside the grid, so a board using this reserves `WALL_WIDTH / 2` around
 * it rather than letting that half bleed over whatever the board is sitting in.
 */
export const GridWalls: FC<Props> = ({ size, isWall, colour }) => {
  const segments: string[] = []
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      // Only the top and left of each square, so a wall between two of them is emitted once. That leaves the
      // far two sides of the grid, which no square is above or to the left of, added after.
      if (isWall(row, col, -1, 0)) segments.push(`M${col} ${row}h1`)
      if (isWall(row, col, 0, -1)) segments.push(`M${col} ${row}v1`)
    }
  for (let i = 0; i < size; i++) segments.push(`M${i} ${size}h1`, `M${size} ${i}v1`)
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      aria-hidden
      focusable="false"
    >
      <path
        d={segments.join("")}
        stroke={colour}
        strokeWidth={WALL_WIDTH}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="square"
        fill="none"
      />
    </svg>
  )
}
