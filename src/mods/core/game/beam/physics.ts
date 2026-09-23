// How light travels over a square grid: directions, mirror angles, and the one subtraction that reflects
// one off the other. Shared by every family whose board is a beam and a set of mirrors, so the convention
// has one home and a change to it cannot be made in one family and missed in another.

/**
 * A direction of travel, indexed anticlockwise from rightward. Even is square, odd is diagonal.
 *
 * ```
 *   3 2 1     0 right      4 left
 *   4 · 0     1 up-right   5 down-left
 *   5 6 7     2 up         6 down
 *             3 up-left    7 down-right
 * ```
 */
export type Direction = number

/** The eight, by name. */
export const DIR = {
  right: 0,
  upRight: 1,
  up: 2,
  upLeft: 3,
  left: 4,
  downLeft: 5,
  down: 6,
  downRight: 7,
} as const

export const DIRECTIONS: readonly Direction[] = [0, 1, 2, 3, 4, 5, 6, 7]

export const SQUARE_DIRECTIONS: readonly Direction[] = [DIR.right, DIR.up, DIR.left, DIR.down]

/** Directions and stops both live modulo eight, counted from the same axis. */
export const mod8 = (n: number): number => ((n % 8) + 8) % 8

export type CellRef = { row: number; col: number }

/**
 * Where a mirror's line lies, in eighth-turns anticlockwise from the row: 0 lies flat along it, 2 is 45°
 * (`/`), 4 stands up the column, 6 is 135° (`\`). One number is the whole of what a mirror is.
 */
export type MirrorAngle = number

/** The two diagonals, as the angles they are. */
export const SLASH: MirrorAngle = 2
export const BACKSLASH: MirrorAngle = 6

export const TURN_ANGLES: readonly MirrorAngle[] = [SLASH, BACKSLASH]

export const cellKey = (at: CellRef): string => `${at.row},${at.col}`

export const sameCell = (a: CellRef, b: CellRef): boolean => a.row === b.row && a.col === b.col

/** One cell along, per direction. */
const STEPS: readonly CellRef[] = [
  { row: 0, col: 1 }, // right
  { row: -1, col: 1 }, // up-right
  { row: -1, col: 0 }, // up
  { row: -1, col: -1 }, // up-left
  { row: 0, col: -1 }, // left
  { row: 1, col: -1 }, // down-left
  { row: 1, col: 0 }, // down
  { row: 1, col: 1 }, // down-right
]

export const directionStep = (direction: Direction): CellRef => STEPS[direction]

export const stepCell = (at: CellRef, direction: Direction): CellRef => ({
  row: at.row + STEPS[direction].row,
  col: at.col + STEPS[direction].col,
})

export const opposite = (direction: Direction): Direction => mod8(direction + 4)

/** Where a mirror sends a beam: reflection across its line, which in eighth-turns is one subtraction. */
export const reflect = (angle: MirrorAngle, travel: Direction): Direction => mod8(angle - travel)

export const insideGrid = (size: number, at: CellRef): boolean =>
  at.row >= 0 && at.col >= 0 && at.row < size && at.col < size

/** The shortest a route leg may be: two keeps consecutive bend mirrors from touching, corners included. */
export const MIN_LEG = 2

/** The mirror that turns a beam from `enter` to `exit`, where one exists. */
export const angleFor = (enter: Direction, exit: Direction): MirrorAngle | undefined => {
  if (exit === enter || exit === opposite(enter)) return undefined
  const angle = mod8(enter + exit)
  return angle === 0 || angle === 4 ? undefined : angle
}

/** Which of the four lines a beam runs along — the row, the column, and the two diagonals. */
export const axisOf = (direction: Direction): number => direction % 4

/** The two ways a track may run across a beam — the quarter turns either side of it. */
export const perpendicular = (direction: Direction): Direction[] => {
  const axis = direction % 4
  return [mod8(axis + 2), mod8(axis + 6)]
}

export const stepsToEdge = (size: number, at: CellRef, direction: Direction): number => {
  const step = directionStep(direction)
  const rows = step.row < 0 ? at.row : step.row > 0 ? size - 1 - at.row : Number.POSITIVE_INFINITY
  const cols = step.col < 0 ? at.col : step.col > 0 ? size - 1 - at.col : Number.POSITIVE_INFINITY
  return Math.min(rows, cols)
}
