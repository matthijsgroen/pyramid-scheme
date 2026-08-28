import { cellsOf, exitLane, type RushHourPuzzle, type RushHourState } from "@/mods/puzzle/game/rushHour/rushHour"
import { optimalPath, type Move } from "@/mods/puzzle/game/rushHour/solveRushHour"

export type RushHourHint = {
  /** Which sentence says why, keyed per place (`puzzle-screens.md` §4.3). */
  key: "drive" | "back" | "clear" | "room"
  /** Which way the piece is being pushed, as its own sentence — a hint has to be followable without sight. */
  action: "left" | "right" | "up" | "down"
  /** The piece to move, and where to. */
  move: Move
  /** The cells it would stand on afterwards, so the board can point at them. */
  cells: number[]
}

/**
 * The next right move, and why it is the next right move.
 *
 * **The search IS the hint here** (`docs/game-design/puzzles/rush-hour.md` §4). There is no ladder of
 * techniques to report, because nothing on this board is deduced; what a stuck player needs is the one
 * move that shortens the way out, which is the first step of a shortest solution from where they are.
 *
 * The reason is read off that move rather than argued separately, and it is honest at four strengths: the
 * player's own piece moving forward means the way is open that far; the player's own piece moving BACK is
 * the one a stuck player will not think of; a piece that stands across the player's lane is in the way
 * outright; anything else is what has to move before something else can.
 *
 * **The backwards case is called out because it is the documented place people get stuck.** Moving away
 * from the goal is the "counter-intuitive move" the problem-solving literature measures as a difficulty
 * factor (family doc §7), and a hint that says "the way ahead is clear that far" about a leftward shove is
 * not merely vague — it is wrong.
 *
 * Derived only when asked, like every family whose solver costs something.
 */
export const buildRushHourHint = (puzzle: RushHourPuzzle, state: RushHourState): RushHourHint | undefined => {
  const path = optimalPath(puzzle, state)
  if (!path || path.length === 0) return undefined
  const move = path[0]
  const piece = puzzle.pieces[move.index]
  const from = state.offsets[move.index]
  const forward = move.offset > from
  return {
    key: move.index === 0 ? (forward ? "drive" : "back") : crossesExit(puzzle, state, move.index) ? "clear" : "room",
    action: piece.horizontal ? (forward ? "right" : "left") : forward ? "down" : "up",
    move,
    cells: cellsOf(puzzle.size, piece, move.offset),
  }
}

/**
 * Whether this piece stands in the lane the player has to leave by — the difference between "in the way"
 * and "in the way of what is in the way".
 *
 * Read off where the piece stands NOW rather than where the board started, since that is what the sentence
 * is about.
 */
const crossesExit = (puzzle: RushHourPuzzle, state: RushHourState, index: number) => {
  const piece = puzzle.pieces[index]
  const lane = exitLane(puzzle)
  if (piece.horizontal) return piece.lane === lane
  const offset = state.offsets[index]
  return offset <= lane && lane <= offset + piece.len - 1
}
