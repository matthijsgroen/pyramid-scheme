import type { Difficulty } from "@/data/difficultyLevels"
import type { BalanceOptions } from "./generateBalance"

// Tier settings, from docs/game-design/puzzles/balance-scale.md §5. Each tier adds ONE thing, and
// generation is made to prove it: `techniqueCap` says what a board must demand, `minCancels` and
// `minSwaps` say that the move a tier introduces actually comes up rather than showing up in a third
// of the draws.
export const BALANCE_CONFIG: Record<Difficulty, BalanceOptions> = {
  // Read one row. One glyph, one scale, nothing standing on both pans — the bottom of this family's
  // own scale (P4): `🪲 7 = 15` is the whole board.
  starter: { glyphCount: 1, scaleCount: 1, maxValue: 10, maxItemsPerPan: 2, cancelling: false, techniqueCap: "alone" },
  // Share a number out between equal glyphs. Still nothing to cancel: a second glyph and a second
  // scale are enough of a step, and cancelling is a move of its own to learn rather than a tax on
  // learning to share.
  junior: {
    glyphCount: 2,
    scaleCount: 2,
    maxValue: 10,
    maxItemsPerPan: 3,
    cancelling: false,
    techniqueCap: "equalShares",
  },
  // Take the same thing off both pans, and compare two rows. Both new, and both demanded.
  expert: { glyphCount: 2, scaleCount: 2, maxValue: 12, maxItemsPerPan: 3, minCancels: 1, techniqueCap: "difference" },
  // The same two skills, half again as much board, and heavier numbers.
  master: { glyphCount: 3, scaleCount: 3, maxValue: 15, maxItemsPerPan: 3, minCancels: 1, techniqueCap: "difference" },
  // Trade a glyph for what a row says it is worth — twice, because the row that comes out of the
  // first trade is what makes the second possible. Four glyphs and four scales to lose track of.
  wizard: {
    glyphCount: 4,
    scaleCount: 4,
    maxValue: 15,
    maxItemsPerPan: 3,
    minSwaps: 2,
    techniqueCap: "swap",
  },
}
