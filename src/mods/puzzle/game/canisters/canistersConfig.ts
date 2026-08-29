import type { Difficulty } from "@/data/difficultyLevels"
import type { CanistersOptions } from "./generateCanisters"

// Tier settings, from docs/game-design/puzzles/canisters.md §5.
//
// **One volume a board, at every tier.** Measuring a second one from the first's leftovers doubles the
// board and asks the same question twice, and playtesting says the first one is already the hard part — a
// player who can measure one can measure two, and is only being kept at it longer. `legs` stays a knob
// because the generator supports it; nothing turns it up.
//
// **A tier is a line length between two bounds, and the ceiling is what teaches.** `minLine` alone is a
// floor over a lottery: a two-pour measure and a nine-pour chain would be the same tier, and a player who
// draws the second one first meets the whole family at once. With `maxLine` each tier says one thing —
// junior is what a pour leaves behind, expert is parking a leftover and picking it up again, master is a
// line long enough that the two compound, wizard is a fourth canister to lose the measure in.
//
// **The family debuts at junior** (`meta.ts`), because starter holds three canister rooms against junior's
// seventeen and three rooms cannot teach an arithmetic. Nothing asks for the starter row; it is the floor
// the tier list needs, kept below junior so it stays honest if a starter room is ever authored.
//
// **Every tier carries one spare move.** What it buys is a mis-tap, a pour that turns out to do nothing,
// one slip on a long line — not a second opinion about the line itself.
//
// Measured over 200 boards a tier, counting the choices that must go right (log2 of the useful moves at
// each step, summed along the line): junior 2.7, expert 4.7, master 6.6, wizard 11.7.
export const CANISTERS_CONFIG: Record<Difficulty, CanistersOptions> = {
  starter: { legs: 1, canisters: 3, maxCapacity: 8, minLine: 2, maxLine: 2, minForks: 1, slack: 1 },
  // Two or three pours, and the whole board is one idea: what stays behind when you fill another canister.
  junior: { legs: 1, canisters: 3, maxCapacity: 9, minLine: 2, maxLine: 3, minForks: 1, slack: 1 },
  // Long enough that a leftover has to be parked in the third canister and picked up again.
  expert: { legs: 1, canisters: 3, maxCapacity: 12, minLine: 4, maxLine: 6, minForks: 2, slack: 1 },
  // The longest line on the ladder, on the widest capacities three canisters get.
  master: { legs: 1, canisters: 3, maxCapacity: 15, minLine: 6, maxLine: 9, minForks: 3, slack: 1 },
  // A fourth canister: more ways to go wrong at every step. The branching is what changed, at 5.6 legal
  // moves a step against master's 3.6 — so its line is SHORTER than master's to pay for it.
  wizard: { legs: 1, canisters: 4, maxCapacity: 16, minLine: 5, maxLine: 7, minForks: 4, slack: 1 },
}
