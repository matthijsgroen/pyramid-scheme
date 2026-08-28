import type { Difficulty } from "@/data/difficultyLevels"
import type { CanistersOptions } from "./generateCanisters"

/**
 * Whether the canisters show how full they are.
 *
 * **Display only, which is why it is not one of `CanistersOptions`.** Those are hashed into the seed
 * bucket key, and a board generates identically whichever way it is drawn.
 *
 * `shown` draws the level to scale — no number, but a careful player can eyeball it against the canister's
 * own size. `sensed` draws only empty, part-full or full, which keeps the one reading a pour has to give
 * (which canister ran out) and makes the amount something only arithmetic reaches.
 */
export const CANISTERS_LEVELS: Record<Difficulty, "shown" | "sensed"> = {
  starter: "shown",
  junior: "shown",
  expert: "shown",
  master: "sensed",
  wizard: "sensed",
}

// Tier settings, from docs/game-design/puzzles/canisters.md §5.
//
// **Line length is the difficulty and forks are the guarantee.** A long line that never forks is a line
// the player walks; a board has to make them choose, and `minForks` is what says so out loud.
export const CANISTERS_CONFIG: Record<Difficulty, CanistersOptions> = {
  // Three canisters, one short measure, and a move in hand — the point is learning what a pour does.
  starter: { legs: 1, canisters: 3, maxCapacity: 9, minLine: 2, minForks: 1, slack: 1 },
  junior: { legs: 1, canisters: 3, maxCapacity: 11, minLine: 4, minForks: 2 },
  expert: { legs: 2, canisters: 3, maxCapacity: 13, minLine: 4, minForks: 3 },
  master: { legs: 2, canisters: 3, maxCapacity: 15, minLine: 6, minForks: 4 },
  // A fourth canister: more ways to go wrong at every step, and the level no longer drawn to scale.
  //
  // Its line is allowed to be SHORTER than master’s, which looks wrong and is not: a fourth canister opens
  // more routes, so the shortest one gets shorter while every step of it forks wider. The forks are the
  // difficulty here, not the length.
  wizard: { legs: 2, canisters: 4, maxCapacity: 16, minLine: 4, minForks: 4 },
}
