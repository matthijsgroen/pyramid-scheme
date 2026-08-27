import type { Difficulty } from "@/data/difficultyLevels"
import type { CanistersOptions } from "./generateCanisters"

// Tier settings, from docs/game-design/puzzles/canisters.md §5. Two dials, and neither is board size —
// there is no board to grow.
//
// **The line length is the difficulty, not the penalty.** Opening the wrong way costs at most two moves,
// measured over every reachable target of every pair up to 16 — a player who opens wrong recovers, they
// do not walk a ruined line. So what makes a board hard is how much arithmetic it takes to SEE which
// opening is shorter, which is the length of the line itself; and the budget being exact is what makes
// being wrong cost anything at all.
//
// **Legs are the depth.** Each one is a fresh opening measured from wherever the last left the canisters,
// so three legs is three decisions rather than one long line. A third canister would be the obvious
// alternative and is the wrong one: it takes the branching factor from 3.6 legal moves per state to 8.4
// and the shortest line stops being unique, which is a search, and a search cannot be hinted.
export const CANISTERS_CONFIG: Record<Difficulty, CanistersOptions> = {
  // One volume, small vessels, and a move in hand — the point here is learning what a pour does, and a
  // player still learning that should not fail on the opening.
  starter: { legs: 1, maxCapacity: 8, minGap: 2, minLine: 3, slack: 1 },
  // The budget goes exact, so the opening becomes the puzzle.
  junior: { legs: 1, maxCapacity: 10, minGap: 2, minLine: 5 },
  // A second volume, measured from the first one's leftovers.
  expert: { legs: 2, maxCapacity: 12, minGap: 2, minLine: 5 },
  master: { legs: 2, maxCapacity: 13, minGap: 2, minLine: 7 },
  // Three decisions, the widest vessels, and the longest lines to read them off.
  wizard: { legs: 3, maxCapacity: 15, minGap: 2, minLine: 7 },
}
