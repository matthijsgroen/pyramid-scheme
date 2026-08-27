import { forcedMove, type CanistersPuzzle, type Move, type Volumes } from "@/mods/puzzle/game/canisters/canisters"

/**
 * What the hint says, per docs/game-design/puzzles/canisters.md §4.
 *
 * **A hint names a reason, never a plan.** On a forced step it says why every other move is dead — the two
 * local rules, both checkable from the vessels in front of the player. On a choice step it says only that
 * there is a choice, because the choice IS the puzzle and naming the shorter opening would be reading out
 * the answer.
 */
export type CanistersHint = {
  /** Translation key under `canisters.hint`. */
  key: "forced" | "choice" | "overBudget"
  /** The move the reason is about, lit on the board. Absent where the player still has a choice. */
  move?: Move
}

export const buildCanistersHint = (
  puzzle: CanistersPuzzle,
  volumes: Volumes,
  seen: ReadonlySet<string>,
  movesLeft: number
): CanistersHint => {
  // A board that can no longer be finished is the one thing worth saying outright: no reason about a
  // single move would tell the player they are pouring on with nothing left to reach.
  if (movesLeft <= 0) return { key: "overBudget" }
  const forced = forcedMove(puzzle.capacities, volumes, seen)
  return forced === undefined ? { key: "choice" } : { key: "forced", move: forced }
}
