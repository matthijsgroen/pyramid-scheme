import type { Difficulty } from "@/data/difficultyLevels"
import type { BalanceOptions } from "./generateBalance"

// Tier settings, from docs/game-design/puzzles/balance-scale.md §5. Each tier adds ONE thing, and
// generation is made to prove it: `techniqueCap` says what a board must demand, `minCancels` and
// `minSwaps` say that the move a tier introduces actually comes up rather than showing up in a third
// of the draws.
//
// The whole ladder sits one notch above where it started (§5). `🪲 7 = 15` is the bottom of the family's
// own scale on paper, and in the hand it is one subtraction and then the board is over — a tier that
// teaches the rule rather than a tier that asks anything of it. So reading a row is what a starter board
// *is made of* rather than what it demands, and every tier above moved up with it.
export const BALANCE_CONFIG: Record<Difficulty, BalanceOptions> = {
  // Share a number out between equal glyphs. Two glyphs and two scales, and still nothing to cancel:
  // cancelling would do the board's own arithmetic here (§4.1), and reading a row is already in the
  // board — sharing out is what settles the second glyph, so the first read is a step rather than the
  // whole puzzle.
  starter: {
    glyphCount: 2,
    scaleCount: 2,
    maxValue: 10,
    maxItemsPerPan: 3,
    cancelling: false,
    techniqueCap: "equalShares",
  },
  // Take the same thing off both pans, and compare two rows. Both new, and both demanded.
  junior: { glyphCount: 2, scaleCount: 2, maxValue: 12, maxItemsPerPan: 3, minCancels: 1, techniqueCap: "difference" },
  // The same two skills, half again as much board, and heavier numbers.
  expert: { glyphCount: 3, scaleCount: 3, maxValue: 15, maxItemsPerPan: 3, minCancels: 1, techniqueCap: "difference" },
  // Trade a glyph for what a row says it is worth. One trade, so the move arrives on its own before the
  // top tier asks for a chain of them.
  master: { glyphCount: 3, scaleCount: 4, maxValue: 15, maxItemsPerPan: 3, minSwaps: 1, techniqueCap: "swap" },
  // The trade again, but as a chain: the row that comes out of the first is what makes the second
  // possible. Four glyphs and four scales to lose track of.
  wizard: {
    glyphCount: 4,
    scaleCount: 4,
    maxValue: 15,
    maxItemsPerPan: 3,
    minSwaps: 2,
    techniqueCap: "swap",
  },
}
