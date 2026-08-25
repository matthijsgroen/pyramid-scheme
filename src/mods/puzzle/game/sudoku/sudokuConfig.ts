import type { Difficulty } from "@/data/difficultyLevels"
import type { SudokuOptions } from "./generateSudoku"

// Tier settings, from docs/game-design/puzzles/sudoku.md §5.
//
// **The grid never moves**: every tier is the same 6 wide, cut into three chambers across and two
// down. So what is left are three settings answering three different questions — the CAP is the
// hardest reason a board may ASK for, DEMANDS is the reason it is guaranteed to NEED, and the FLOOR
// is how much of the answer it is handed to start with.
//
// A 6x6 has a low ceiling and this table is honest about it (design doc §5.4): what separates wizard
// from master is not a new kind of reasoning, because there is no further kind this grid can force —
// it is the same chamber-line reasoning with nothing handed over.
export const SUDOKU_CONFIG: Record<Difficulty, SudokuOptions> = {
  // Naked singles only, and a board handed nearly half of itself: what is left in this square, when
  // its row, its column and its chamber have taken everything else. The whole family in one sentence,
  // with no scanning to do to reach it.
  starter: { techniqueCap: "nakedSingle", minGivens: 16 },
  // The second reading of a square, and the one that makes this a puzzle rather than a subtraction:
  // a value can be forced into a square that could still hold three others, because there is nowhere
  // ELSE in the row, the column or the chamber for it to go.
  junior: { techniqueCap: "hiddenSingle", minGivens: 14, demands: "hiddenSingle" },
  // The same rung against less of the answer. The reasoning is not what got harder — the board did,
  // and finding the one home takes a scan of the whole group rather than a glance at a nearly full one.
  expert: { techniqueCap: "hiddenSingle", minGivens: 12, demands: "hiddenSingle" },
  // Dug as far as the singles reach: nothing is handed back, and the board stops where the reasoning
  // runs out rather than where a tier decided to be generous. About ten squares, and which ten is the
  // whole difficulty.
  master: { techniqueCap: "hiddenSingle", minGivens: 0, demands: "hiddenSingle" },
  // The chamber arguing with the lines that cross it: a value pinned to one row of a chamber is off
  // that row everywhere else, and a value pinned to one chamber along a row is off the rest of that
  // chamber. It is the only reason on this ladder that is about the CHAMBERS rather than about a
  // square, and about one dig in fifty produces a 6x6 that genuinely needs it — which is exactly what
  // makes it the top tier rather than a rung on the way up (design doc §5.4).
  wizard: { techniqueCap: "boxLine", minGivens: 0, demands: "boxLine" },
}
