/**
 * The blockade: pieces stuck in lanes, one of them yours, and the way out on the east edge.
 *
 * The rules whole (`docs/game-design/puzzles/rush-hour.md` §2): a piece occupies whole cells along one
 * lane and may slide either way along it until something stops it — never across, never off. The board is
 * done when piece 0 reaches the edge it leaves by. **There is no illegal state and no move budget**, so
 * this family has no mistakes to catch: every position a player can reach is a position they can leave.
 */

/**
 * A piece, as its lane rather than as coordinates.
 *
 * **The lane is the piece's identity here, and it never changes** — only `offset` does, which is why the
 * board's shape and the board's state can be separate values (`RushHourState` below). For a horizontal
 * piece `lane` is its row and `offset` its leftmost column; for a vertical one they are the column and the
 * topmost row.
 */
export type Piece = {
  lane: number
  offset: number
  len: number
  horizontal: boolean
}

export type RushHourPuzzle = {
  size: number
  /**
   * Cells nothing may ever stand on, as `row * size + col`.
   *
   * **A knob for making a board harder without making it fuller** (family doc §3.2). A wall pins the pieces
   * around it exactly as another piece would, but it can never be shoved out of the way, so it lengthens
   * every route past it — the enumeration of the whole 6×6 space puts the hardest wall-less board at 51
   * moves and the hardest one-wall board at 60. Never in the player's own lane: one east of them could
   * never be got out of the way, and one west only shortens the board.
   */
  walls?: readonly number[]
  /**
   * Every piece on the board, with the offsets it starts at. **Index 0 is the player's own**, always
   * horizontal, and the row it sits in is the row the way out is cut into.
   */
  pieces: readonly Piece[]
}

/** Where every piece stands, in the puzzle's own order. Nothing else about a board changes. */
export type RushHourState = { readonly offsets: readonly number[] }

export const createRushHourState = (puzzle: RushHourPuzzle): RushHourState => ({
  offsets: puzzle.pieces.map(piece => piece.offset),
})

/** The row the way out is cut into — the player's own lane, by definition. */
export const exitLane = (puzzle: RushHourPuzzle) => puzzle.pieces[0].lane

/** Done when the player's piece has its nose on the east edge. */
export const rushHourSolved = (puzzle: RushHourPuzzle, state: RushHourState) =>
  state.offsets[0] + puzzle.pieces[0].len === puzzle.size

/** Which cells a piece stands on, as `row * size + col`. */
export const cellsOf = (size: number, piece: Piece, offset: number): number[] =>
  Array.from({ length: piece.len }, (_, step) =>
    piece.horizontal ? piece.lane * size + offset + step : (offset + step) * size + piece.lane
  )

/**
 * Which piece stands on each cell, or -1. Built per call rather than carried: it is derived from the
 * offsets, and a board is small enough that the array is cheaper than keeping two things in step.
 */
export const WALL = -2

export const occupancy = (puzzle: RushHourPuzzle, state: RushHourState): number[] => {
  const grid = new Array<number>(puzzle.size ** 2).fill(-1)
  for (const cell of puzzle.walls ?? []) grid[cell] = WALL
  puzzle.pieces.forEach((piece, index) => {
    for (const cell of cellsOf(puzzle.size, piece, state.offsets[index])) grid[cell] = index
  })
  return grid
}

/**
 * How far a piece may slide either way, as the offsets it may legally take.
 *
 * **Inclusive of where it already stands**, so a pinned piece answers with its own offset twice rather
 * than with an empty range — the caller asking "where may this go" and the caller asking "may it move at
 * all" then read the same value.
 */
export const legalRange = (puzzle: RushHourPuzzle, state: RushHourState, index: number): readonly [number, number] =>
  rangeIn(puzzle, state, index, occupancy(puzzle, state))

/**
 * The same range, off an occupancy map the caller already has.
 *
 * The search asks for every piece's range at every position it visits, and building the map once a
 * position instead of once a piece is the difference between one pass over the board and a dozen.
 */
const rangeIn = (
  puzzle: RushHourPuzzle,
  state: RushHourState,
  index: number,
  grid: readonly number[]
): readonly [number, number] => {
  const piece = puzzle.pieces[index]
  const free = (offset: number) =>
    cellsOf(puzzle.size, piece, offset).every(cell => grid[cell] === -1 || grid[cell] === index)
  let low = state.offsets[index]
  while (low - 1 >= 0 && free(low - 1)) low--
  let high = state.offsets[index]
  while (high + piece.len <= puzzle.size - 1 && free(high + 1)) high++
  return [low, high]
}

/**
 * The board with one piece moved, clamped into its legal range.
 *
 * **Clamped rather than refused.** The gesture is a drag along a lane (§4), and a drag that runs into
 * something should leave the piece where it stopped — a refusal would drop the whole gesture because its
 * end was too far.
 */
export const slidePiece = (
  puzzle: RushHourPuzzle,
  state: RushHourState,
  index: number,
  offset: number
): RushHourState => {
  const [low, high] = legalRange(puzzle, state, index)
  const landed = Math.min(high, Math.max(low, offset))
  if (landed === state.offsets[index]) return state
  const offsets = [...state.offsets]
  offsets[index] = landed
  return { offsets }
}

/** A state as one string, for the search's visited set and for a move's identity. */
export const stateKey = (state: RushHourState) => state.offsets.join(",")

/** Every board one move away, each with the piece it moved and where to. */
export const neighbours = (
  puzzle: RushHourPuzzle,
  state: RushHourState
): { index: number; offset: number; state: RushHourState }[] => {
  const out: { index: number; offset: number; state: RushHourState }[] = []
  const grid = occupancy(puzzle, state)
  puzzle.pieces.forEach((_, index) => {
    const [low, high] = rangeIn(puzzle, state, index, grid)
    for (let offset = low; offset <= high; offset++) {
      if (offset === state.offsets[index]) continue
      const offsets = [...state.offsets]
      offsets[index] = offset
      out.push({ index, offset, state: { offsets } })
    }
  })
  return out
}
