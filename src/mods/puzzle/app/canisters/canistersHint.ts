import {
  applyMove,
  shortestLine,
  type CanistersPuzzle,
  type Move,
  type Volumes,
} from "@/mods/puzzle/game/canisters/canisters"

/**
 * What the hint says, per docs/game-design/puzzles/canisters.md §4.
 *
 * **It names the pour and says why** — the bar every family here is held to (`puzzle-screens.md` §5): a
 * hint names the move, never the answer. The reason is always something the player can check against the
 * canisters in front of them: this pour fills that one to the brim, or empties this one out.
 *
 * **What it never says is which canister ends up holding the volume.** The board writes what is in each
 * vessel, so a hint naming an amount would tell the player nothing they cannot already read; what it must
 * not do is name the vessel to claim. Even the last pour of a leg says only that the volume will be
 * standing afterwards — finding where stays the player's.
 */
export type CanistersHint = {
  /** Translation key under `canisters.hint`. */
  key: "fills" | "empties" | "last" | "stuck" | "overBudget"
  /** The canisters the sentence names, by their size. */
  params?: { from?: number; to?: number; target?: number }
  /** The pour the reason is about, lit on the board. */
  move?: Move
}

export const buildCanistersHint = (
  puzzle: CanistersPuzzle,
  volumes: Volumes,
  movesLeft: number,
  target: number
): CanistersHint => {
  if (movesLeft <= 0) return { key: "overBudget" }

  const line = shortestLine(puzzle.capacities, volumes, target)
  // Whether the board is still winnable is a fact about the position rather than a plan, and it is the one
  // thing a player cannot work out without playing it twice.
  if (line === null || line.length === 0 || line.length > movesLeft) return { key: "stuck", params: { target } }

  // The pour to make is the first of the shortest line. Which is a search, and this family has no
  // technique ladder that reaches a move — see the design doc §4, where that cost is written down.
  const move = line[0]
  const params = { from: puzzle.capacities[move.from], to: puzzle.capacities[move.to], target }
  if (line.length === 1) return { key: "last", move, params }

  // The reason is whichever of the two things a pour can do actually happens, and the player can see which
  // by looking: a pour stops when the source runs dry or the destination is full.
  const after = applyMove(puzzle.capacities, volumes, move)
  const fills = after[move.to] === puzzle.capacities[move.to]
  return { key: fills ? "fills" : "empties", move, params }
}
