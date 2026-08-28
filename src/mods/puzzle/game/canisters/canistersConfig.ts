import type { Difficulty } from "@/data/difficultyLevels"
import type { CanistersOptions } from "./generateCanisters"

// Tier settings, from docs/game-design/puzzles/canisters.md §5.
//
// **Line length is the difficulty and forks are the guarantee.** A long line that never forks is a line
// the player walks; a board has to make them choose, and `minForks` is what says so out loud.
//
// **Every tier carries one spare move, and one is the ceiling.** A wrong opening costs exactly two moves
// and never more (§3), so the budget has to stay under that or the decision this family is built on stops
// being binding — a player who opens the wrong way must still lose the board. What a single spare buys is
// everything below that line: a mis-tap, a pour that turns out to do nothing, one slip on a fifteen-pour
// line. That was the difference between a puzzle and a test of not fumbling.
export const CANISTERS_CONFIG: Record<Difficulty, CanistersOptions> = {
  // Three canisters, one short measure, and a move in hand — the point is learning what a pour does.
  starter: { legs: 1, canisters: 3, maxCapacity: 9, minLine: 2, minForks: 1, slack: 1 },
  junior: { legs: 1, canisters: 3, maxCapacity: 11, minLine: 4, minForks: 2, slack: 1 },
  expert: { legs: 2, canisters: 3, maxCapacity: 13, minLine: 4, minForks: 3, slack: 1 },
  master: { legs: 2, canisters: 3, maxCapacity: 15, minLine: 6, minForks: 4, slack: 1 },
  // A fourth canister: more ways to go wrong at every step.
  //
  // Its line is allowed to be SHORTER than master’s, which looks wrong and is not: a fourth canister opens
  // more routes, so the shortest one gets shorter while every step of it forks wider. Measured over 200
  // boards a tier, master walks 14.9 pours forking 2.5 ways; wizard walks 9.2 forking 5.2 ways, and every
  // one of its steps forks. Counting the choices that must go right — log2 of the useful moves, summed
  // along the line — the tiers still climb: 3.4, 5.3, 13.7, 17.9, 21.3. The forks are the difficulty here,
  // not the length.
  wizard: { legs: 2, canisters: 4, maxCapacity: 16, minLine: 4, minForks: 4, slack: 1 },
}
